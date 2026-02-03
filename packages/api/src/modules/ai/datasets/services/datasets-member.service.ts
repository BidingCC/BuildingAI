import { BaseService } from "@buildingai/base";
import {
    TEAM_ROLE,
    TEAM_ROLE_PERMISSIONS,
    type TeamRoleType,
} from "@buildingai/constants/shared/team-role.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    DatasetMember,
    DatasetMemberApplication,
    Datasets,
    MemberApplicationStatus,
} from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";

import type {
    ApplyToDatasetDto,
    ListApplicationsDto,
    ListMembersDto,
    RejectApplicationDto,
    UpdateMemberRoleDto,
} from "../dto/member.dto";

/**
 * 知识库成员服务
 *
 * - 已加入成员列表、申请列表（成员可见，仅创建者可操作申请）
 * - 申请加入、同意/拒绝申请、修改成员角色、移除成员（仅创建者可修改角色/同意拒绝/移除）
 * - 权限：管理员(manager)=预览+提问+编辑；普通成员(viewer)=预览+提问；仅创建者(owner)可管理成员与申请
 */
@Injectable()
export class DatasetMemberService extends BaseService<DatasetMember> {
    protected readonly logger = new Logger(DatasetMemberService.name);

    constructor(
        @InjectRepository(DatasetMember)
        private readonly datasetMemberRepository: Repository<DatasetMember>,
        @InjectRepository(DatasetMemberApplication)
        private readonly applicationRepository: Repository<DatasetMemberApplication>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
    ) {
        super(datasetMemberRepository);
    }

    /**
     * 获取知识库并校验存在，否则抛 404
     */
    async getDatasetOrThrow(datasetId: string): Promise<Datasets> {
        const dataset = await this.datasetsRepository.findOne({ where: { id: datasetId } });
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        return dataset;
    }

    /**
     * 是否为知识库创建者（只有创建者可以修改成员角色、同意/拒绝申请、移除成员）
     */
    async isCreator(datasetId: string, userId: string): Promise<boolean> {
        const dataset = await this.getDatasetOrThrow(datasetId);
        return dataset.createdBy === userId;
    }

    /**
     * 知识库当前成员数量（仅统计已加入且有效的成员）
     */
    async countMembers(datasetId: string): Promise<number> {
        await this.getDatasetOrThrow(datasetId);
        return this.datasetMemberRepository.count({
            where: { datasetId, isActive: true },
        });
    }

    /**
     * 获取当前用户在知识库中的成员角色，非成员返回 null
     */
    async getMemberRole(datasetId: string, userId: string): Promise<TeamRoleType | null> {
        const member = await this.datasetMemberRepository.findOne({
            where: { datasetId, userId, isActive: true },
        });
        return member?.role ?? null;
    }

    /**
     * 校验当前用户必须是知识库成员，否则抛 403
     */
    async requireMember(datasetId: string, userId: string): Promise<DatasetMember> {
        const member = await this.datasetMemberRepository.findOne({
            where: { datasetId, userId, isActive: true },
        });
        if (!member) throw HttpErrorFactory.forbidden("您不是该知识库成员，无权操作");
        return member;
    }

    /**
     * 校验当前用户必须是创建者，否则抛 403
     */
    async requireCreator(datasetId: string, userId: string): Promise<void> {
        const ok = await this.isCreator(datasetId, userId);
        if (!ok) throw HttpErrorFactory.forbidden("仅创建者可以执行此操作");
    }

    /**
     * 检查用户在知识库中的权限（供全局守卫使用；超级管理员视为 owner 权限）
     */
    async checkPermission(
        datasetId: string,
        user: Pick<UserPlayground, "id" | "isRoot">,
        permission: keyof (typeof TEAM_ROLE_PERMISSIONS)[keyof typeof TEAM_ROLE_PERMISSIONS],
    ): Promise<void> {
        if (isEnabled(user.isRoot)) {
            const ownerPermissions = TEAM_ROLE_PERMISSIONS[TEAM_ROLE.OWNER];
            if (!ownerPermissions[permission]) {
                throw HttpErrorFactory.forbidden("您没有执行此操作的权限");
            }
            return;
        }

        const member = await this.datasetMemberRepository.findOne({
            where: { datasetId, userId: user.id, isActive: true },
        });
        if (!member) {
            throw HttpErrorFactory.forbidden("您不是该知识库的团队成员");
        }
        const rolePermissions = TEAM_ROLE_PERMISSIONS[member.role];
        if (!rolePermissions[permission]) {
            throw HttpErrorFactory.forbidden("您没有执行此操作的权限");
        }
    }

    /**
     * 已加入的成员列表（分页，带用户信息与角色）
     */
    async listMembers(
        datasetId: string,
        userId: string,
        query: ListMembersDto,
    ): Promise<{ list: DatasetMember[]; total: number }> {
        await this.getDatasetOrThrow(datasetId);
        await this.requireMember(datasetId, userId);

        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;

        const qb = this.datasetMemberRepository
            .createQueryBuilder("m")
            .leftJoinAndSelect("m.user", "user")
            .where("m.dataset_id = :datasetId", { datasetId })
            .andWhere("m.is_active = true");

        const total = await qb.getCount();
        const list = await qb
            .orderBy("m.created_at", "ASC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getMany();

        return { list, total };
    }

    /**
     * 申请列表（待审核/已通过/已拒绝）- 成员可见，仅创建者可操作
     */
    async listApplications(
        datasetId: string,
        userId: string,
        query: ListApplicationsDto,
    ): Promise<{ list: DatasetMemberApplication[]; total: number }> {
        await this.getDatasetOrThrow(datasetId);
        await this.requireMember(datasetId, userId);

        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;

        const qb = this.applicationRepository
            .createQueryBuilder("a")
            .leftJoinAndSelect("a.user", "user")
            .where("a.dataset_id = :datasetId", { datasetId });

        if (query.status) {
            const status =
                query.status === "pending"
                    ? MemberApplicationStatus.PENDING
                    : query.status === "approved"
                      ? MemberApplicationStatus.APPROVED
                      : MemberApplicationStatus.REJECTED;
            qb.andWhere("a.status = :status", { status });
        }

        const total = await qb.getCount();
        const list = await qb
            .orderBy("a.created_at", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getMany();

        return { list, total };
    }

    /**
     * 申请加入知识库
     */
    async applyToJoin(
        datasetId: string,
        user: UserPlayground,
        dto: ApplyToDatasetDto,
    ): Promise<DatasetMemberApplication> {
        await this.getDatasetOrThrow(datasetId);

        const alreadyMember = await this.datasetMemberRepository.findOne({
            where: { datasetId, userId: user.id, isActive: true },
        });
        if (alreadyMember) throw HttpErrorFactory.badRequest("您已是该知识库成员，无需重复申请");

        const pending = await this.applicationRepository.findOne({
            where: {
                datasetId,
                userId: user.id,
                status: MemberApplicationStatus.PENDING,
            },
        });
        if (pending) throw HttpErrorFactory.badRequest("您已提交过申请，请等待审核");

        const appliedRole = dto.appliedRole ?? TEAM_ROLE.VIEWER;
        if (appliedRole === TEAM_ROLE.OWNER)
            throw HttpErrorFactory.badRequest("不能申请成为所有者");

        const application = this.applicationRepository.create({
            datasetId,
            userId: user.id,
            status: MemberApplicationStatus.PENDING,
            appliedRole,
            message: dto.message ?? null,
        });
        return this.applicationRepository.save(application);
    }

    /**
     * 同意申请（仅创建者可操作）- 通过后创建成员并更新申请状态
     */
    async approveApplication(
        datasetId: string,
        applicationId: string,
        operatorId: string,
    ): Promise<DatasetMember> {
        await this.requireCreator(datasetId, operatorId);

        const application = await this.applicationRepository.findOne({
            where: { id: applicationId, datasetId },
        });
        if (!application) throw HttpErrorFactory.notFound("申请记录不存在");
        if (application.status !== MemberApplicationStatus.PENDING) {
            throw HttpErrorFactory.badRequest("该申请已处理，无法重复操作");
        }

        const existingMember = await this.datasetMemberRepository.findOne({
            where: { datasetId, userId: application.userId, isActive: true },
        });
        if (existingMember) {
            await this.applicationRepository.update(applicationId, {
                status: MemberApplicationStatus.APPROVED,
                reviewedBy: operatorId,
                reviewedAt: new Date(),
            });
            return existingMember;
        }

        const member = this.datasetMemberRepository.create({
            datasetId,
            userId: application.userId,
            role: application.appliedRole,
            isActive: true,
            invitedBy: operatorId,
        });
        await this.datasetMemberRepository.save(member);

        await this.applicationRepository.update(applicationId, {
            status: MemberApplicationStatus.APPROVED,
            reviewedBy: operatorId,
            reviewedAt: new Date(),
        });

        this.logger.log(
            `Application ${applicationId} approved, member created for user ${application.userId}`,
        );
        return member;
    }

    /**
     * 拒绝申请（仅创建者可操作）
     */
    async rejectApplication(
        datasetId: string,
        applicationId: string,
        operatorId: string,
        dto: RejectApplicationDto,
    ): Promise<void> {
        await this.requireCreator(datasetId, operatorId);

        const application = await this.applicationRepository.findOne({
            where: { id: applicationId, datasetId },
        });
        if (!application) throw HttpErrorFactory.notFound("申请记录不存在");
        if (application.status !== MemberApplicationStatus.PENDING) {
            throw HttpErrorFactory.badRequest("该申请已处理，无法重复操作");
        }

        await this.applicationRepository.update(applicationId, {
            status: MemberApplicationStatus.REJECTED,
            reviewedBy: operatorId,
            reviewedAt: new Date(),
            rejectReason: dto.rejectReason ?? null,
        });
    }

    /**
     * 修改成员角色（仅创建者可操作）；不能把别人改成 owner，也不能移除自己的 owner
     */
    async updateMemberRole(
        datasetId: string,
        memberId: string,
        dto: UpdateMemberRoleDto,
        operatorId: string,
    ): Promise<DatasetMember> {
        await this.requireCreator(datasetId, operatorId);

        const member = await this.datasetMemberRepository.findOne({
            where: { id: memberId, datasetId, isActive: true },
        });
        if (!member) throw HttpErrorFactory.notFound("成员不存在");

        if (member.role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("不能修改创建者的角色");
        }
        if (dto.role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("不能将成员设置为所有者");
        }

        await this.datasetMemberRepository.update(memberId, { role: dto.role });
        return this.datasetMemberRepository.findOneOrFail({ where: { id: memberId } });
    }

    /**
     * 移除成员（仅创建者可操作）；不能移除自己（创建者）
     */
    async removeMember(datasetId: string, memberId: string, operatorId: string): Promise<void> {
        await this.requireCreator(datasetId, operatorId);

        const member = await this.datasetMemberRepository.findOne({
            where: { id: memberId, datasetId, isActive: true },
        });
        if (!member) throw HttpErrorFactory.notFound("成员不存在");
        if (member.role === TEAM_ROLE.OWNER && member.userId === operatorId) {
            throw HttpErrorFactory.badRequest("不能移除自己（创建者）");
        }
        if (member.role === TEAM_ROLE.OWNER) {
            throw HttpErrorFactory.badRequest("不能移除知识库创建者");
        }

        await this.datasetMemberRepository.update(memberId, { isActive: false });
        this.logger.log(`Member ${memberId} removed from dataset ${datasetId}`);
    }

    /**
     * 初始化知识库所有者（创建知识库时调用）
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
}
