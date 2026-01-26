import { CacheService } from "@buildingai/cache";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Permission, Role } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 角色权限服务
 *
 * 处理角色和权限的动态关系，提供角色权限查询和验证功能
 */
@Injectable()
export class RolePermissionService {
    private readonly logger = new Logger(RolePermissionService.name);

    constructor(
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private permissionRepository: Repository<Permission>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private cacheService: CacheService,
    ) {}

    /**
     * 获取用户的所有角色
     *
     * @param userId 用户ID
     * @param userType 用户类型，区分API前台用户和Console后台管理员
     * @returns 角色列表
     */
    async getUserRoles(userId: string): Promise<Role | null> {
        // 使用缓存提高性能
        const cacheKey = `user_roles:${userId}`;
        const cachedRoles = await this.cacheService.get<Role>(cacheKey);

        if (cachedRoles) {
            return cachedRoles;
        }

        // 从数据库查询管理员角色
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ["role"],
        });

        if (!user || !user.role) {
            return null;
        }

        // 缓存结果，设置适当的过期时间
        await this.cacheService.set(cacheKey, user.role, 3600); // 缓存1小时

        return user.role;
    }

    /**
     * 获取用户的所有权限（包括直接权限和通过角色获得的权限）
     *
     * @param userId 用户ID
     * @param userType 用户类型，区分API前台用户和Console后台管理员
     * @returns 权限列表
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        // 使用缓存提高性能
        const cacheKey = `user_permissions:${userId}`;
        const cachedPermissions = await this.cacheService.get<string[]>(cacheKey);

        if (cachedPermissions) {
            return cachedPermissions;
        }

        // 只处理Console管理员的权限
        // 从数据库查询管理员及其权限
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ["role", "role.permissions"],
        });

        if (!user) {
            return [];
        }

        // 收集所有权限（直接权限和通过角色获得的权限）
        const permissionSet = new Set<string>();

        // 添加通过角色获得的权限
        if (user.role && user.role.permissions) {
            user.role.permissions.forEach((permission) => {
                permissionSet.add(permission.code);
            });
        }

        const permissions = Array.from(permissionSet);

        // 缓存结果，设置适当的过期时间
        await this.cacheService.set(cacheKey, permissions, 3600); // 缓存1小时

        return permissions;
    }

    /**
     * 获取角色拥有的所有权限
     *
     * @param roleNames 角色名称数组
     * @returns 权限列表
     */
    async getPermissionsByRoles(roleNames: string[]): Promise<string[]> {
        if (!roleNames || roleNames.length === 0) {
            return [];
        }

        // 使用缓存提高性能
        const cacheKey = `role_permissions:${roleNames.sort().join(",")}`;
        const cachedPermissions = await this.cacheService.get<string[]>(cacheKey);

        if (cachedPermissions) {
            return cachedPermissions;
        }

        // 从数据库查询角色拥有的权限
        const roles = await this.roleRepository.find({
            where: { name: In(roleNames) },
            relations: ["permissions"],
        });

        // 提取所有权限并去重
        const permissions = new Set<string>();
        roles.forEach((role) => {
            role.permissions.forEach((permission) => {
                permissions.add(permission.name);
            });
        });

        const permissionList = Array.from(permissions);

        // 缓存结果，设置适当的过期时间
        await this.cacheService.set(cacheKey, permissionList, 3600); // 缓存1小时

        return permissionList;
    }

    /**
     * 检查用户是否拥有指定权限
     *
     * @param userId 用户ID
     * @param requiredPermissions 需要的权限数组
     * @param userType 用户类型，区分API前台用户和Console后台管理员
     * @returns 是否拥有权限
     */
    async checkUserHasPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const userPermissions = await this.getUserPermissions(userId);

        // 检查是否拥有任一所需权限
        return requiredPermissions.some((permission) => userPermissions.includes(permission));
    }

    /**
     * 检查角色是否拥有指定权限
     *
     * @param roleNames 角色名称数组
     * @param requiredPermissions 需要的权限数组
     * @returns 是否拥有权限
     */
    async checkRoleHasPermissions(
        roleNames: string[],
        requiredPermissions: string[],
    ): Promise<boolean> {
        if (
            !roleNames ||
            roleNames.length === 0 ||
            !requiredPermissions ||
            requiredPermissions.length === 0
        ) {
            return false;
        }

        const permissions = await this.getPermissionsByRoles(roleNames);

        // 检查是否拥有任一所需权限
        return requiredPermissions.some((permission) => permissions.includes(permission));
    }

    /**
     * 清除用户相关的缓存
     *
     * @param userId 用户ID
     * @param userType 用户类型，区分API前台用户和Console后台管理员
     */
    async clearUserCache(userId: string): Promise<void> {
        await this.cacheService.del(`user_roles:${userId}`);
        await this.cacheService.del(`user_permissions:${userId}`);
    }

    /**
     * 清除角色相关的缓存
     *
     * @param roleName 角色名称
     */
    async clearRoleCache(): Promise<void> {
        // 由于 CacheService 不支持 keys 方法，我们只能重置所有缓存
        // 在实际应用中，可以考虑使用更高级的缓存实现，如 Redis
        // 或者维护一个缓存键的集合来跟踪相关的缓存
        await this.cacheService.reset();
    }
}
