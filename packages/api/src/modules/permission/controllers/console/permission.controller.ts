import { BaseController } from "@buildingai/base";
import { Permission, PermissionType } from "@buildingai/db/entities";
import { FindOptionsWhere, ILike } from "@buildingai/db/typeorm";
import { isEnabled } from "@buildingai/utils";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { PermissionService } from "@modules/permission/services/permission.service";
import { Get, Param, Post, Query } from "@nestjs/common";

/**
 * 权限控制器
 *
 * 处理权限相关的请求，包括获取所有带权限编码的接口信息
 */
@ConsoleController("permission", "系统权限")
export class PermissionConsoleController extends BaseController {
    constructor(private readonly permissionService: PermissionService) {
        super();
    }

    /**
     * 获取所有权限信息
     *
     * 即时扫描系统所有接口权限，可选择是否进行分组
     *
     * @param group 是否进行分组，默认为 true
     * @returns 权限信息列表或分组后的权限信息
     */
    @Get("scan-permissions")
    @Permissions({
        code: "scan-permissions",
        name: "扫描权限（即时）",
        description: "即时扫描系统所有接口权限",
    })
    getPermissions(@Query("group") group = "true") {
        return group === "true"
            ? this.permissionService.getApiPermissionsGroupList()
            : this.permissionService.getApiPermissionsList();
    }

    /**
     * 获取所有带权限的API接口信息
     *
     * 即时扫描系统所有带有权限的接口，可选择是否进行分组
     *
     * @param group 是否进行分组，默认为 true
     * @returns API接口信息列表或分组后的API接口信息
     */
    @Get("scan-api")
    @Permissions({
        code: "scan-api",
        name: "扫描权限接口（即时）",
        description: "即时扫描系统所有带有权限的接口",
    })
    getApiRouterGroupList(@Query("group") group = "true") {
        return group === "true"
            ? this.permissionService.getApiRouterGroupList()
            : this.permissionService.getApiRouterList();
    }

    /**
     * 获取权限列表
     *
     * @param group 权限分组编码，对应 ApiPermissionsGroupItem 中的 code 字段，用于按照权限分组进行筛选
     * @param keyword 关键词，用于模糊搜索名称和代码
     * @param isDeprecated 是否废弃，true表示已废弃，false表示未废弃，不传表示全部
     * @param grouped 是否按分组返回权限列表，true表示按分组返回，false表示直接返回列表
     * @returns 权限列表或分组后的权限列表
     */
    @Get("list")
    @Permissions({
        code: "list",
        name: "查看权限列表",
        description: "获取所有权限列表",
    })
    async findAll(
        @Query("type") typeParam?: string,
        @Query("group") group?: string,
        @Query("keyword") keyword?: string,
        @Query("isDeprecated") isDeprecated?: string,
        @Query("isGrouped") isGrouped?: string,
    ): Promise<Permission[] | Record<string, Permission[]>> {
        // 构建基本查询条件
        let whereConditions: FindOptionsWhere<Permission>[] = [];

        // 基本条件对象
        const baseCondition: FindOptionsWhere<Permission> = {};

        // 处理权限类型筛选
        if (typeParam) {
            // 确保使用正确的枚举值
            if (typeParam === "system") {
                baseCondition.type = PermissionType.SYSTEM;
            }
        }

        // 处理分组筛选 - 支持对 group 和 groupName 进行模糊搜索
        if (group) {
            // 不直接设置 baseCondition.group，而是在 whereConditions 中添加 OR 条件
            // 先保存当前的 baseCondition
            const baseConditionCopy = { ...baseCondition };

            // 创建两个条件：一个用于 group 搜索，一个用于 groupName 搜索
            const groupCondition = {
                ...baseConditionCopy,
                group: ILike(`%${group}%`),
            };
            const groupNameCondition = {
                ...baseConditionCopy,
                groupName: ILike(`%${group}%`),
            };

            // 将两个条件添加到条件数组中（OR关系）
            whereConditions = [groupCondition, groupNameCondition];
        }

        // 处理是否废弃筛选
        if (isDeprecated !== undefined) {
            baseCondition.isDeprecated = isEnabled(isDeprecated);
        }

        // 处理关键词搜索（模糊搜索名称和代码）
        if (keyword) {
            // 创建两个条件：一个用于名称搜索，一个用于代码搜索
            const nameCondition = {
                ...baseCondition,
                name: ILike(`%${keyword}%`),
            };
            const codeCondition = {
                ...baseCondition,
                code: ILike(`%${keyword}%`),
            };

            // 将两个条件添加到条件数组中（OR关系）
            whereConditions.push(nameCondition, codeCondition);
        } else {
            // 如果没有关键词搜索，只使用基本条件
            whereConditions.push(baseCondition);
        }

        // 查询权限列表
        const permissions = await this.permissionService.findAll({
            where: whereConditions,
            order: {
                group: "ASC",
                id: "ASC",
            },
        });

        // 如果不需要分组返回，直接返回权限列表
        if (!isEnabled(isGrouped)) {
            return permissions;
        }

        // 按分组返回权限列表
        const tempGroupedPermissions: Record<string, any> = {};
        const result: any[] = [];

        // 获取所有组别信息
        const groupList = this.permissionService.getApiGroupList();

        // 初始化分组对象，添加组别信息
        groupList.forEach((group) => {
            if (group && group.code) {
                tempGroupedPermissions[group.code] = {
                    code: group.code,
                    name: group.name,
                    permissions: [],
                };
            }
        });

        // 添加未分组组别
        tempGroupedPermissions["未分组"] = {
            code: "未分组",
            name: "未分组权限",
            permissions: [],
        };

        // 将权限按照分组进行分类
        permissions.forEach((permission) => {
            const groupKey = permission.group || "未分组";

            // 如果该分组不存在，添加到未分组中
            if (!tempGroupedPermissions[groupKey]) {
                tempGroupedPermissions["未分组"].permissions.push(permission);
            } else {
                // 否则添加到对应分组中
                tempGroupedPermissions[groupKey].permissions.push(permission);
            }
        });

        // 将对象转换为数组
        for (const key in tempGroupedPermissions) {
            // 只添加有权限的分组
            if (tempGroupedPermissions[key].permissions.length > 0) {
                result.push(tempGroupedPermissions[key]);
            }
        }

        return result;
    }

    /**
     * 同步API权限到数据库
     *
     * 将扫描到的API权限与数据库中的权限进行同步
     * 已删除的接口权限将被标记为废弃
     *
     * @returns 同步结果
     */
    @Post("sync")
    @Permissions({
        code: "sync",
        name: "同步权限",
        description: "将扫描到的API权限与数据库中的权限进行同步",
    })
    async syncApiPermissions(): Promise<{
        added: number;
        updated: number;
        deprecated: number;
        total: number;
    }> {
        return this.permissionService.syncApiPermissions();
    }

    /**
     * 清理废弃的权限
     *
     * 删除标记为废弃的权限，并清理相关的角色关联
     *
     * @returns 清理结果
     */
    @Post("cleanup")
    @Permissions({
        code: "cleanup",
        name: "清理权限",
        description: "删除标记为废弃的权限，并清理相关的角色关联",
    })
    async cleanupDeprecatedPermissions(): Promise<{ removed: number }> {
        return this.permissionService.cleanupDeprecatedPermissions();
    }

    /**
     * 根据权限编码查询权限详情
     *
     * @param code 权限编码
     * @returns 权限详情
     */
    @Get(":code")
    @Permissions({
        code: "info",
        name: "查看权限详情",
        description: "根据权限编码查询权限详情",
    })
    async findByCode(@Param("code") code: string) {
        return this.permissionService.findByCode(code);
    }
}
