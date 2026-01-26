import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Permission } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { Injectable } from "@nestjs/common";

import { AssignPermissionsDto, CreateRoleDto, QueryRoleDto, UpdateRoleDto } from "./../dto";

/**
 * 角色管理服务
 *
 * 提供角色的增删改查等管理功能
 */
@Injectable()
export class RoleService extends BaseService<Role> {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly rolePermissionService: RolePermissionService,
    ) {
        super(roleRepository);
    }

    /**
     * 创建角色
     *
     * @param createRoleDto 创建角色数据
     * @returns 创建的角色信息
     */
    async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
        // 检查角色名称是否已存在
        const existingRole = await this.roleRepository.findOne({
            where: { name: createRoleDto.name },
        });

        if (existingRole) {
            throw HttpErrorFactory.badRequest("角色名称已存在");
        }

        // 创建新角色实例
        const role = this.roleRepository.create({
            name: createRoleDto.name,
            description: createRoleDto.description,
            isDisabled: createRoleDto.isDisabled ?? false,
        });

        // 如果提供了权限ID，则关联权限
        if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
            const permissions = await this.permissionRepository.findBy({
                id: In(createRoleDto.permissionIds),
            });
            role.permissions = permissions;
        }

        // 保存角色
        return this.roleRepository.save(role);
    }

    /**
     * 分页查询角色列表
     *
     * @param queryRoleDto 查询参数
     * @returns 分页角色列表
     */
    async list(queryRoleDto: QueryRoleDto) {
        const { name, description, isDisabled } = queryRoleDto;

        const queryBuilder = this.repository
            .createQueryBuilder("role")
            .leftJoinAndSelect("role.users", "user")
            .leftJoinAndSelect("role.permissions", "permission")
            .orderBy("role.id", "DESC");

        if (name) {
            queryBuilder.andWhere("role.name LIKE :name", {
                name: `%${name}%`,
            });
        }

        if (description) {
            queryBuilder.andWhere("role.description LIKE :description", {
                description: `%${description}%`,
            });
        }

        // 如果指定了禁用状态，则按禁用状态筛选
        if (isDisabled !== undefined) {
            queryBuilder.andWhere("role.isDisabled = :isDisabled", {
                isDisabled,
            });
        }

        return this.paginateQueryBuilder(queryBuilder, queryRoleDto);
    }

    /**
     * 查询全部角色列表（不分页）
     *
     * @returns 全部角色列表
     */
    async all(): Promise<Role[]> {
        const queryBuilder = this.repository
            .createQueryBuilder("role")
            .leftJoinAndSelect("role.permissions", "permission")
            .orderBy("role.id", "DESC");

        queryBuilder.andWhere("role.isDisabled = :isDisabled", {
            isDisabled: false,
        });

        return queryBuilder.getMany();
    }

    /**
     * 根据ID查询角色详情
     *
     * @param id 角色ID
     * @returns 角色详情
     */
    async findRoleById(id: string): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: ["permissions"],
        });

        if (!role) {
            throw HttpErrorFactory.notFound("角色不存在");
        }

        return role;
    }

    /**
     * 更新角色信息
     *
     * @param updateRoleDto 更新角色数据
     * @returns 更新后的角色信息
     */
    async updateRoleById(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
        const { permissionIds, ...updateData } = updateRoleDto;
        // 查找要更新的角色
        const role = await this.findOneById(id);

        // 如果更新角色名称，需要检查名称是否已存在
        if (updateData.name && updateData.name !== role.name) {
            const existingRole = await this.roleRepository.findOne({
                where: { name: updateData.name },
            });

            if (existingRole) {
                throw HttpErrorFactory.badRequest("角色名称已存在");
            }
        }

        // 获取更新前的角色名称，用于后续清除缓存
        const oldRoleName = role.name;

        // 更新角色基本信息
        Object.assign(role, updateData);

        // 如果提供了权限ID，则更新关联的权限
        if (permissionIds) {
            // 如果角色被禁用且尝试更新权限，则抛出错误
            if ((role.isDisabled || updateData.isDisabled) && permissionIds.length > 0) {
                throw HttpErrorFactory.badRequest("禁用的角色不能分配权限");
            }

            const permissions = await this.permissionRepository.findBy({
                id: In(permissionIds),
            });
            role.permissions = permissions;
        }

        // 保存更新后的角色
        const updatedRole = await this.roleRepository.save(role);

        // 清除相关缓存
        await this.clearRoleRelatedCache(id, oldRoleName);
        this.logger.log(`已清除角色 ${updatedRole.name} (ID: ${id}) 相关的缓存`);

        return updatedRole;
    }

    /**
     * 删除角色
     *
     * @param id 角色ID
     * @returns 操作结果
     */
    async remove(id: string): Promise<void> {
        // 查找要删除的角色
        const role = await this.findOneById(id);

        // 检查是否有用户关联了该角色
        const usersWithRole = await this.getUsersByRoleId(id);
        if (usersWithRole.length > 0) {
            // 自动解除用户与角色的关联
            for (const user of usersWithRole) {
                user.role = null;
            }
            await this.userRepository.save(usersWithRole);
            this.logger.log(
                `已自动解除 ${usersWithRole.length} 个用户与角色 ${role.name} (ID: ${id}) 的关联`,
            );
        }

        // 在删除角色前，清除相关缓存
        await this.clearRoleRelatedCache(id, role.name);
        this.logger.log(`已清除角色 ${role.name} (ID: ${id}) 相关的缓存`);

        // 删除角色
        await this.roleRepository.remove(role);
    }

    /**
     * 获取拥有指定角色的所有用户
     *
     * @param roleId 角色ID
     * @returns 用户列表
     */
    private async getUsersByRoleId(roleId: string): Promise<User[]> {
        return this.userRepository
            .createQueryBuilder("user")
            .innerJoin("user.role", "role", "role.id = :roleId", { roleId })
            .getMany();
    }

    /**
     * 清除与角色相关的所有缓存
     *
     * @param roleId 角色ID
     * @param roleName 角色名称
     */
    private async clearRoleRelatedCache(roleId: string, roleName: string): Promise<void> {
        try {
            // 1. 清除角色自身的缓存
            await this.rolePermissionService.clearRoleCache();

            // 2. 获取拥有该角色的所有用户
            const users = await this.getUsersByRoleId(roleId);

            // 3. 清除这些用户的权限缓存
            for (const user of users) {
                await this.rolePermissionService.clearUserCache(user.id);
            }

            this.logger.log(
                `已清除角色 ${roleName} (ID: ${roleId}) 相关的缓存，影响用户数: ${users.length}`,
            );
        } catch (error) {
            this.logger.error(
                `清除角色 ${roleName} (ID: ${roleId}) 相关缓存失败: ${error.message}`,
            );
        }
    }

    /**
     * 重写基类的清除缓存方法
     *
     * @param id 角色ID
     */
    protected async clearCache(id: string): Promise<void> {
        const role = await this.findOneById(id);
        if (role) {
            await this.clearRoleRelatedCache(id, role.name);
        }
    }

    /**
     * 为角色分配权限
     *
     * @param id 角色ID
     * @param permissionIds 权限ID列表
     * @returns 更新后的角色信息
     */
    async assignPermissions(assignPermissionsDto: AssignPermissionsDto): Promise<Role> {
        const { id, permissionIds } = assignPermissionsDto;
        // 查找要更新的角色
        const role = await this.findOneById(id);

        // 检查角色是否被禁用
        if (role.isDisabled) {
            throw HttpErrorFactory.badRequest("禁用的角色不能分配权限");
        }

        // 验证权限是否存在
        const permissions = await this.permissionRepository.findBy({
            id: In(permissionIds),
        });

        // 检查是否所有权限ID都有效
        if (permissions.length !== permissionIds.length) {
            const foundIds = permissions.map((p) => p.id);
            const invalidIds = permissionIds.filter((id) => !foundIds.includes(id));
            throw HttpErrorFactory.badRequest(`以下权限ID无效: ${invalidIds.join(", ")}`);
        }

        permissions.forEach((permission) => {
            if (isEnabled(permission.isDeprecated)) {
                throw HttpErrorFactory.badRequest(`权限"${permission.name}"已弃用`);
            }
        });

        // 更新角色权限
        role.permissions = permissions;

        // 保存更新后的角色
        const updatedRole = await this.roleRepository.save(role);

        // 清除相关缓存
        await this.clearRoleRelatedCache(id, role.name);
        this.logger.log(`已更新角色 ${updatedRole.name} (ID: ${id}) 的权限，并清除相关缓存`);

        return updatedRole;
    }
}
