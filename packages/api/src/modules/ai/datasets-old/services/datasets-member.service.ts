import { BaseService } from "@buildingai/base";
import { TEAM_ROLE, TEAM_ROLE_PERMISSIONS } from "@buildingai/constants/shared/team-role.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { DatasetMember } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import {
    AddTeamMemberDto,
    BatchAddTeamMemberDto,
    BatchTeamMemberOperationDto,
    QueryTeamMemberDto,
    RemoveTeamMemberDto,
    TransferOwnershipDto,
    UpdateTeamMemberRoleDto,
} from "../dto/members.dto";
import { TeamMemberDetailDto } from "../interfaces/member.interface";

/**
 * Dataset team member management service
 */
@Injectable()
export class DatasetMemberService extends BaseService<DatasetMember> {
    protected readonly logger = new Logger(DatasetMemberService.name);

    constructor(
        @InjectRepository(DatasetMember)
        private readonly datasetMemberRepository: Repository<DatasetMember>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super(datasetMemberRepository);
    }

    /**
     * Add team member
     */
    async addMember(addMemberDto: AddTeamMemberDto, inviterId: string): Promise<DatasetMember> {
        const { datasetId, userId, role, note } = addMemberDto;

        // 验证邀请者权限
        await this.checkPermission(datasetId, inviterId, "canAddMembers");

        // 验证知识库是否存在
        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
        });
        if (!dataset) {
            throw HttpErrorFactory.notFound("Dataset not found");
        }

        // 验证用户是否存在
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw HttpErrorFactory.notFound("User not found");
        }

        // 检查用户是否已是团队成员
        const existingMember = await this.datasetMemberRepository.findOne({
            where: { datasetId, userId },
        });
        if (existingMember) {
            throw HttpErrorFactory.badRequest("User is already a team member");
        }

        // 不能添加所有者角色（所有者只能通过转移所有权产生）
        if (role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("Cannot directly add owner role");
        }

        // 创建团队成员记录
        const newMember = this.datasetMemberRepository.create({
            datasetId,
            userId,
            role,
            invitedBy: inviterId,
            note,
            isActive: true,
        });
        return this.datasetMemberRepository.save(newMember);
    }

    /**
     * 批量Add team member
     */
    async batchAddMembers(
        batchAddDto: BatchAddTeamMemberDto,
        inviterId: string,
    ): Promise<DatasetMember[]> {
        const { datasetId, members } = batchAddDto;

        // 验证邀请者权限
        await this.checkPermission(datasetId, inviterId, "canAddMembers");

        // 验证知识库是否存在
        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
        });
        if (!dataset) {
            throw HttpErrorFactory.notFound("Dataset not found");
        }

        // 验证所有用户是否存在
        const userIds = members.map((m) => m.userId);
        const users = await this.userRepository.find({
            where: { id: In(userIds) },
        });
        if (users.length !== userIds.length) {
            throw HttpErrorFactory.badRequest("部分User not found");
        }

        // 检查用户是否已是团队成员
        const existingMembers = await this.datasetMemberRepository.find({
            where: { datasetId, userId: In(userIds) },
        });
        if (existingMembers.length > 0) {
            const existingUserIds = existingMembers.map((m) => m.userId);
            throw HttpErrorFactory.badRequest(`用户 ${existingUserIds.join(", ")} 已是团队成员`);
        }

        // 创建团队成员记录
        const newMembers = members.map((member) =>
            this.datasetMemberRepository.create({
                datasetId,
                userId: member.userId,
                role: member.role,
                invitedBy: inviterId,
                note: member.note,
                isActive: true,
            }),
        );

        return this.datasetMemberRepository.save(newMembers);
    }

    /**
     * 更新团队成员角色
     */
    async updateMemberRole(
        updateRoleDto: UpdateTeamMemberRoleDto,
        operatorId: string,
    ): Promise<DatasetMember> {
        const { memberId, role, note } = updateRoleDto;

        // 查找成员记录
        const member = await this.findOneById(memberId, {
            relations: ["dataset"],
        });

        // 验证操作者权限
        await this.checkPermission(member.datasetId, operatorId, "canModifyPermissions");

        // 不能修改为所有者角色（只能通过转移所有权）
        if (role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("不能直接修改为所有者角色，请使用转移所有权功能");
        }

        // 不能修改所有者的角色
        if (member.role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("不能修改所有者的角色");
        }

        // 检查是否为管理者互相操作的情况
        const operatorMember = await this.getUserMemberInDataset(member.datasetId, operatorId);
        if (
            operatorMember?.role === TEAM_ROLE.MANAGER &&
            member.role === TEAM_ROLE.MANAGER &&
            member.userId !== operatorId
        ) {
            // 管理者可以互相操作
        } else if (
            operatorMember?.role === TEAM_ROLE.MANAGER &&
            member.role !== TEAM_ROLE.MANAGER
        ) {
            // 管理者可以操作非管理者
        } else if (operatorMember?.role === TEAM_ROLE.OWNER) {
            // 所有者可以操作任何人
        } else {
            throw HttpErrorFactory.forbidden("没有权限修改该成员的角色");
        }

        // 更新角色
        await this.datasetMemberRepository.update(memberId, {
            role,
            note,
        });
        return this.findOneById(memberId) as Promise<DatasetMember>;
    }

    /**
     * 移除团队成员
     */
    async removeMember(removeMemberDto: RemoveTeamMemberDto, operatorId: string): Promise<void> {
        const { memberId } = removeMemberDto;

        // 查找成员记录
        const member = await this.findOneById(memberId);

        // 不能移除所有者
        if (member.role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("不能移除所有者，请先转移所有权");
        }

        // 检查权限
        if (member.userId === operatorId) {
            // 自己可以移除自己（除了所有者）
        } else {
            // 验证操作者权限
            await this.checkPermission(member.datasetId, operatorId, "canRemoveMembers");

            // 检查是否为管理者互相操作的情况
            const operatorMember = await this.getUserMemberInDataset(member.datasetId, operatorId);
            if (
                operatorMember?.role === TEAM_ROLE.MANAGER &&
                member.role === TEAM_ROLE.MANAGER &&
                member.userId !== operatorId
            ) {
                // 管理者可以互相移除
            } else if (
                operatorMember?.role === TEAM_ROLE.MANAGER &&
                member.role !== TEAM_ROLE.MANAGER
            ) {
                // 管理者可以移除非管理者
            } else if (operatorMember?.role === TEAM_ROLE.OWNER) {
                // 所有者可以移除任何人
            } else {
                throw HttpErrorFactory.forbidden("没有权限移除该成员");
            }
        }

        // 删除成员记录
        await this.delete(memberId);
    }

    /**
     * 查询团队成员列表
     *
     * @param queryDto 查询参数
     * @param currentUserId 当前用户ID，用于判断是否可以操作成员
     * @returns 成员列表和分页信息
     */
    async getMembers(queryDto: QueryTeamMemberDto, currentUserId: string) {
        const { datasetId, role, username, isActive, ...paginationParams } = queryDto;

        // 1. 构建查询
        const queryBuilder = this.buildMembersQuery(datasetId, role, username, isActive);

        // 2. 执行分页查询
        const members = await this.paginateQueryBuilder(queryBuilder, paginationParams, [
            "user.phone",
            "user.phoneAreaCode",
            "user.permissions",
            "user.password",
            "inviter.password",
            "inviter.phone",
            "inviter.phoneAreaCode",
            "inviter.permissions",
        ]);

        // 3. 获取当前用户的角色信息
        const currentUserMember = await this.getUserMemberInDataset(datasetId, currentUserId);
        const currentUserRole = currentUserMember?.role || null;
        const isCurrentUserOwner = currentUserRole === TEAM_ROLE.OWNER;

        // 4. 处理成员列表，添加权限相关字段
        members.items = members.items.map((item) => {
            // 判断是否可以操作该成员
            return {
                ...item,
                canOperate: this.canOperateMember(
                    currentUserRole,
                    item.role,
                    item.userId === currentUserId,
                ),
                oneself: item.userId === currentUserId,
                isCurrentUserOwner,
            };
        });

        return members;
    }

    /**
     * 构建团队成员查询
     */
    private buildMembersQuery(
        datasetId: string,
        role?: string,
        username?: string,
        isActive?: boolean,
    ) {
        const queryBuilder = this.datasetMemberRepository
            .createQueryBuilder("member")
            .innerJoinAndSelect("member.user", "user")
            .leftJoinAndSelect("member.inviter", "inviter")
            .where("member.datasetId = :datasetId", { datasetId });

        // 角色筛选
        if (role) {
            queryBuilder.andWhere("member.role = :role", { role });
        }

        // 用户名搜索
        if (username) {
            queryBuilder.andWhere("user.username LIKE :username", {
                username: `%${username}%`,
            });
        }

        // 启用状态筛选
        if (typeof isActive === "boolean") {
            queryBuilder.andWhere("member.isActive = :isActive", { isActive });
        }

        // 按角色和加入时间排序，所有者排在最前面
        queryBuilder.orderBy("member.role", "ASC").addOrderBy("member.createdAt", "DESC");

        return queryBuilder;
    }

    /**
     * 判断当前用户是否可以操作指定角色的成员
     *
     * @param currentUserRole 当前用户角色
     * @param targetMemberRole 目标成员角色
     * @param isSelf 是否为自己
     * @returns 是否可以操作
     */
    private canOperateMember(
        currentUserRole: string | null,
        targetMemberRole: string,
        isSelf: boolean,
    ): boolean {
        // 如果没有角色，不能操作任何人
        if (!currentUserRole) return false;

        // 所有者可以操作任何人（除了自己）
        if (currentUserRole === TEAM_ROLE.OWNER) return !isSelf;

        // 管理者可以操作普通成员和其他管理者，但不能操作所有者
        if (currentUserRole === TEAM_ROLE.MANAGER) {
            return targetMemberRole !== TEAM_ROLE.OWNER;
        }

        // 普通成员只能操作自己
        return isSelf;
    }

    /**
     * 获取团队成员详情
     */
    async getMemberDetail(memberId: string): Promise<TeamMemberDetailDto> {
        const member = await this.datasetMemberRepository.findOne({
            where: { id: memberId },
            relations: ["user", "inviter"],
        });

        if (!member) {
            throw HttpErrorFactory.notFound("团队成员不存在");
        }

        return {
            id: member.id,
            datasetId: member.datasetId,
            userId: member.userId,
            role: member.role,
            createdAt: member.createdAt,
            invitedBy: member.invitedBy,
            lastActiveAt: member.lastActiveAt,
            isActive: member.isActive,
            note: member.note,
            updatedAt: member.updatedAt,
            user: member.user
                ? {
                      id: member.user.id,
                      username: member.user.username,
                      email: member.user.email,
                      avatar: member.user.avatar,
                      nickname: member.user.nickname,
                  }
                : undefined,
            inviter: member.inviter
                ? {
                      id: member.inviter.id,
                      username: member.inviter.username,
                      nickname: member.inviter.nickname,
                  }
                : undefined,
        };
    }

    /**
     * 转移知识库所有权
     */
    async transferOwnership(
        transferDto: TransferOwnershipDto,
        currentOwnerId: string,
    ): Promise<void> {
        const { datasetId, newOwnerId } = transferDto;

        // 验证当前用户是否为所有者
        const currentOwnerMember = await this.getUserMemberInDataset(datasetId, currentOwnerId);
        if (!currentOwnerMember || currentOwnerMember.role !== TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.forbidden("只有所有者可以转移所有权");
        }

        // 验证新所有者是否为团队成员
        const newOwnerMember = await this.getUserMemberInDataset(datasetId, newOwnerId);
        if (!newOwnerMember) {
            throw HttpErrorFactory.badRequest("新所有者必须已是团队成员");
        }

        // 开始事务
        await this.datasetMemberRepository.manager.transaction(async (manager) => {
            // 将当前所有者降级为管理者
            await manager.update(DatasetMember, currentOwnerMember.id, {
                role: TEAM_ROLE.MANAGER,
            });

            // 将新所有者提升为所有者
            await manager.update(DatasetMember, newOwnerMember.id, {
                role: TEAM_ROLE.OWNER,
            });

            // 更新知识库的创建者字段
            await manager.update(Datasets, datasetId, {
                createdBy: newOwnerId,
            });
        });

        this.logger.log(
            `知识库 ${datasetId} 所有权已从用户 ${currentOwnerId} 转移到用户 ${newOwnerId}`,
        );
    }

    /**
     * 批量操作团队成员
     */
    async batchOperation(batchDto: BatchTeamMemberOperationDto, operatorId: string): Promise<void> {
        const { memberIds, operation, newRole } = batchDto;

        // 查找所有成员记录
        const members = await this.datasetMemberRepository.findByIds(memberIds);
        if (members.length !== memberIds.length) {
            throw HttpErrorFactory.badRequest("部分成员记录不存在");
        }

        // 验证操作权限（以第一个成员的知识库为准）
        const firstMember = members[0];
        await this.checkPermission(firstMember.datasetId, operatorId, "canManageTeam");

        // 确保所有成员都属于同一个知识库
        const allSameDataset = members.every(
            (member) => member.datasetId === firstMember.datasetId,
        );
        if (!allSameDataset) {
            throw HttpErrorFactory.badRequest("所有成员必须属于同一个知识库");
        }

        // 检查是否包含所有者
        const hasOwner = members.some((member) => member.role === TEAM_ROLE.OWNER);
        if (hasOwner) {
            throw HttpErrorFactory.badRequest("不能对所有者进行批量操作");
        }

        // 执行批量操作
        switch (operation) {
            case "remove":
                await this.datasetMemberRepository.delete(memberIds);
                break;

            case "update_role":
                if (!newRole) {
                    throw HttpErrorFactory.badRequest("更新角色操作需要提供新角色");
                }
                if (newRole === TEAM_ROLE.OWNER) {
                    throw HttpErrorFactory.badRequest("不能批量设置为所有者角色");
                }
                await this.datasetMemberRepository.update(memberIds, {
                    role: newRole,
                });
                break;

            case "toggle_active":
                // 先查询当前状态，然后切换
                for (const member of members) {
                    await this.datasetMemberRepository.update(member.id, {
                        isActive: !member.isActive,
                    });
                }
                break;

            default:
                throw HttpErrorFactory.badRequest("不支持的操作类型");
        }

        this.logger.log(`批量操作完成：${operation}，影响 ${memberIds.length} 个成员`);
    }

    /**
     * 获取用户在知识库中的成员记录
     */
    async getUserMemberInDataset(datasetId: string, userId: string): Promise<DatasetMember | null> {
        return this.datasetMemberRepository.findOne({
            where: { datasetId, userId },
        });
    }

    /**
     * 检查用户在知识库中的权限
     */
    async checkPermission(
        datasetId: string,
        userId: string,
        permission: keyof (typeof TEAM_ROLE_PERMISSIONS)[keyof typeof TEAM_ROLE_PERMISSIONS],
    ): Promise<void> {
        // 检查用户是否为超级管理员
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ["isRoot"],
        });

        if (!user) {
            throw HttpErrorFactory.forbidden("User not found");
        }

        // 超级管理员拥有与所有者一样的权限
        if (user.isRoot) {
            const ownerPermissions = TEAM_ROLE_PERMISSIONS[TEAM_ROLE.OWNER];
            if (!ownerPermissions[permission]) {
                throw HttpErrorFactory.forbidden("您没有执行此操作的权限");
            }
            return;
        }

        const member = await this.getUserMemberInDataset(datasetId, userId);

        if (!member) {
            throw HttpErrorFactory.forbidden("您不是该知识库的团队成员");
        }

        if (!member.isActive) {
            throw HttpErrorFactory.forbidden("您的账号已被禁用");
        }

        const rolePermissions = TEAM_ROLE_PERMISSIONS[member.role];
        if (!rolePermissions[permission]) {
            throw HttpErrorFactory.forbidden("您没有执行此操作的权限");
        }
    }

    /**
     * 获取用户在知识库中的角色
     */
    async getUserRoleInDataset(datasetId: string, userId: string): Promise<string | null> {
        // 检查用户是否为超级管理员
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ["isRoot"],
        });

        if (!user) {
            return null;
        }

        // 超级管理员拥有与所有者一样的角色
        if (user.isRoot) {
            return TEAM_ROLE.OWNER;
        }

        const member = await this.getUserMemberInDataset(datasetId, userId);
        return member?.role || null;
    }

    /**
     * 获取用户作为成员的知识库ID列表
     */
    async getUserMemberDatasetIds(userId: string): Promise<string[]> {
        const members = await this.datasetMemberRepository.find({
            where: { userId, isActive: true },
            select: ["datasetId"],
        });
        return members.map((member) => member.datasetId);
    }

    /**
     * 检查用户是否为知识库成员
     */
    async isDatasetMember(datasetId: string, userId: string): Promise<boolean> {
        const member = await this.getUserMemberInDataset(datasetId, userId);
        return !!member && member.isActive;
    }

    /**
     * 初始化知识库所有者（在创建知识库时调用）
     */
    async initializeOwner(datasetId: string, ownerId: string): Promise<DatasetMember> {
        const owner = this.datasetMemberRepository.create({
            datasetId,
            userId: ownerId,
            role: TEAM_ROLE.OWNER,
            isActive: true,
        });
        return this.datasetMemberRepository.save(owner);
    }

    /**
     * 更新成员最后活跃时间
     */
    async updateLastActiveTime(datasetId: string, userId: string): Promise<void> {
        await this.datasetMemberRepository.update(
            { datasetId, userId },
            { lastActiveAt: new Date() },
        );
    }

    /**
     * 获取用户所在的所有知识库
     */
    async getUserDatasets(userId: string): Promise<{ datasetId: string; role: string }[]> {
        const members = await this.datasetMemberRepository.find({
            where: { userId, isActive: true },
            select: ["datasetId", "role"],
        });
        return members;
    }
}
