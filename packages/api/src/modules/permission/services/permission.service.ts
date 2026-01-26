import { BaseService } from "@buildingai/base";
import { DECORATOR_KEYS } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Permission, PermissionType } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { PermissionOptions } from "@common/decorators/permissions.decorator";
import { Injectable, OnModuleInit, RequestMethod } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";

/**
 * 接口权限信息
 *
 * 包含接口的路径、HTTP方法和所需权限
 */
export interface ApiRouterItem {
    /**
     * 接口路径
     */
    path: string;

    /**
     * HTTP方法
     */
    method: string;

    /**
     * 所需权限列表
     */
    permissions: PermissionOptions[];

    /**
     * 控制器名称
     */
    controller: string;

    /**
     * 处理方法名称
     */
    handler: string;

    /**
     * 接口名称（根据方法名称生成）
     */
    name?: string;

    /**
     * 接口描述（根据方法注释生成）
     */
    description?: string;

    /**
     * 权限分类 - 插件接口权限/系统接口权限
     */
    type: PermissionType;
}

export interface ApiRouterGroupItem {
    code: string;
    name: string;
    items: ApiRouterItem[];
}

export interface ApiPermissionsGroupItem {
    code: string;
    name: string;
    items: PermissionOptions[];
}

export interface ApiGroupItem {
    code: string;
    name: string;
}

/**
 * 权限管理服务
 *
 * 提供权限的管理功能，包括权限扫描、权限列表查询等
 */
@Injectable()
export class PermissionService extends BaseService<Permission> implements OnModuleInit {
    private apiRouterList: ApiRouterItem[] = [];
    private apiRouterGroupList: ApiRouterGroupItem[] = [];

    private apiPermissionsList: PermissionOptions[] = [];
    private apiPermissionsGroupList: ApiPermissionsGroupItem[] = [];

    private apiGroupList: ApiGroupItem[] = [];

    constructor(
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
        private readonly reflector: Reflector,
    ) {
        super(permissionRepository);
    }

    /**
     * 模块初始化时自动执行
     */
    async onModuleInit() {}

    getApiRouterGroupList(): ApiRouterGroupItem[] {
        return this.apiRouterGroupList;
    }

    getApiRouterList(): ApiRouterItem[] {
        return this.apiRouterList;
    }

    getApiPermissionsGroupList(): ApiPermissionsGroupItem[] {
        return this.apiPermissionsGroupList;
    }

    getApiPermissionsList(): PermissionOptions[] {
        return this.apiPermissionsList;
    }

    getApiGroupList(): ApiGroupItem[] {
        return this.apiGroupList;
    }

    /**
     * 根据编码查询权限
     *
     * @param code 权限编码
     * @returns 权限信息
     */
    async findByCode(code: string): Promise<Partial<Permission>> {
        const permission = await super.findOne({
            where: { code },
        });

        if (!permission) {
            throw HttpErrorFactory.notFound(`权限编码 ${code} 不存在`);
        }

        return permission;
    }

    /**
     * 安全地根据编码查询权限，不抛出异常
     *
     * @param code 权限编码
     * @returns 权限信息或null
     */
    async findByCodeSafe(code: string): Promise<Permission | null> {
        try {
            const permission = await super.findOne({
                where: { code },
            });
            return permission as Permission | null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * 扫描所有控制器，收集带权限编码的接口信息
     */
    scanControllers() {
        // 清空之前的扫描结果，避免重复扫描导致的数据累积
        this.apiRouterList = [];
        this.apiGroupList = [];
        this.apiRouterGroupList = [];
        this.apiPermissionsList = [];
        this.apiPermissionsGroupList = [];

        // 获取所有控制器
        const controllers = this.discoveryService.getControllers();

        // 临时存储所有权限，用于去重
        const tempPermissionsMap = new Map<string, PermissionOptions>();
        // 临时存储分组权限，用于构建分组列表
        const tempPermissionsGroupMap = new Map<
            string,
            { code: string; name: string; items: PermissionOptions[] }
        >();

        // 遍历所有控制器
        controllers.forEach((wrapper: InstanceWrapper) => {
            // 跳过未解析的控制器
            if (!wrapper.instance || !wrapper.metatype) {
                return;
            }

            const { instance, metatype } = wrapper;
            const controllerName = metatype.name;

            // 获取控制器的路径前缀
            const controllerPath = Reflect.getMetadata("path", metatype) || "";

            const pathParts = controllerPath.split("/");

            // 过滤web控制器的路由
            if (
                !controllerPath.startsWith("console") &&
                (pathParts.length < 3 || !(pathParts[2] === "console"))
            ) {
                return;
            }

            // 获取控制器的权限组别元数据
            const permissionGroup: ApiGroupItem = this.reflector.get(
                DECORATOR_KEYS.PERMISSION_GROUP_KEY,
                metatype,
            );

            this.apiGroupList.push(permissionGroup);

            // 获取控制器的所有方法
            const prototype = Object.getPrototypeOf(instance);

            // 使用 getAllMethodNames 替代已废弃的 scanFromPrototype 方法
            const methodNames = this.metadataScanner.getAllMethodNames(prototype);

            // 遍历所有方法并收集有权限元数据的方法
            const items: ApiRouterItem[] = [];

            methodNames.forEach((methodName: string) => {
                // 获取方法的权限元数据
                const permissions = this.reflector.get<PermissionOptions[]>(
                    DECORATOR_KEYS.PERMISSIONS_KEY,
                    instance[methodName],
                );

                // 如果方法没有权限元数据，则跳过
                if (!permissions || permissions.length === 0) {
                    return;
                }

                // 获取方法的路径和HTTP方法
                const methodPath = Reflect.getMetadata("path", instance[methodName]) || "";
                const methodHttpMethodEnum =
                    Reflect.getMetadata("method", instance[methodName]) || RequestMethod.GET;

                // 将HTTP方法从枚举值转换为字符串
                const methodHttpMethod = this.getHttpMethodString(methodHttpMethodEnum);

                // 构建完整的接口路径
                let path = `/${controllerPath}`;

                // 如果方法路径不为空，则添加到路径中
                if (methodPath) {
                    path += `/${methodPath}`;
                }

                // 规范化路径，去除多余的斜杠
                path = path.replace(/\/\//g, "/");

                // 生成接口名称和描述
                const methodNameFormatted = this.formatMethodName(methodName);

                // 如果控制器有权限组别元数据，则应用到所有权限上
                if (permissionGroup && permissions) {
                    permissions.forEach((permission) => {
                        // 避免重复拼接前缀：检查是否已经包含分组前缀
                        if (!permission.code.startsWith(`${permissionGroup.code}:`)) {
                            permission.code = `${permissionGroup.code}:${permission.code}`;
                        }

                        if (!permission.group) {
                            permission.group = permissionGroup.code;
                        }
                        if (!permission.groupName) {
                            permission.groupName = permissionGroup.name;
                        }

                        // 收集权限到临时Map中，用于去重
                        tempPermissionsMap.set(permission.code, permission);

                        // 收集权限到分组Map中
                        const groupKey = permission.group || "default";
                        const groupName = permission.groupName || "默认分组";

                        if (!tempPermissionsGroupMap.has(groupKey)) {
                            tempPermissionsGroupMap.set(groupKey, {
                                code: groupKey,
                                name: groupName,
                                items: [],
                            });
                        }

                        // 检查分组中是否已存在相同code的权限，避免重复添加
                        const groupData = tempPermissionsGroupMap.get(groupKey);
                        const existingPermissionIndex = groupData.items.findIndex(
                            (p) => p.code === permission.code,
                        );

                        if (existingPermissionIndex === -1) {
                            groupData.items.push(permission);
                        }
                    });
                }

                // 创建接口权限项并添加到列表
                const item: ApiRouterItem = {
                    path,
                    method: methodHttpMethod,
                    permissions,
                    controller: controllerName,
                    handler: methodName,
                    name: methodNameFormatted,
                    type: permissions[0].type,
                };

                items.push(item);
            });

            this.apiRouterList.push(...items);

            // 只有当permissionGroup存在时才添加到apiRouterGroupList
            if (permissionGroup) {
                this.apiRouterGroupList.push({
                    code: permissionGroup.code,
                    name: permissionGroup.name,
                    items,
                });
            }
        });

        // 将临时Map转换为数组，完成去重的权限列表
        this.apiPermissionsList = Array.from(tempPermissionsMap.values());

        // 将临时分组Map转换为数组，完成分组的权限列表
        this.apiPermissionsGroupList = Array.from(tempPermissionsGroupMap.values());

        // 验证权限编码格式，检测潜在的前缀重叠问题
        this.validatePermissionCodes();

        // 日志输出收集的权限信息
        this.logger.log(`已收集 ${this.apiPermissionsList.length} 个权限编码`);
        this.logger.log(`已收集 ${this.apiPermissionsGroupList.length} 个权限分组`);
    }

    /**
     * 验证权限编码格式，检测潜在问题
     *
     * 检查项：
     * 1. 重复的权限编码
     * 2. 异常的前缀重叠（如 group:group:action）
     * 3. 缺少分组前缀的权限
     */
    private validatePermissionCodes() {
        const codeSet = new Set<string>();
        const warnings: string[] = [];

        this.apiPermissionsList.forEach((permission) => {
            const code = permission.code;

            // 检查重复
            if (codeSet.has(code)) {
                warnings.push(`重复的权限编码: ${code}`);
            }
            codeSet.add(code);

            // 检查异常的前缀重叠（连续出现两次相同的前缀）
            const parts = code.split(":");
            if (parts.length > 2) {
                // 检查是否有连续重复的部分
                for (let i = 0; i < parts.length - 1; i++) {
                    if (parts[i] === parts[i + 1]) {
                        warnings.push(`检测到前缀重叠: ${code} (${parts[i]} 重复)`);
                        break;
                    }
                }
            }

            // 检查是否缺少分组前缀（标准格式应该是 group:action）
            if (!code.includes(":")) {
                warnings.push(`权限编码缺少分组前缀: ${code}`);
            }
        });

        // 输出警告信息
        if (warnings.length > 0) {
            this.logger.warn("⚠️  权限编码验证发现以下问题:");
            warnings.forEach((warning) => {
                this.logger.warn(`   - ${warning}`);
            });
        }
    }

    /**
     * 同步API权限到数据库
     *
     * 将扫描到的API权限与数据库中的权限进行同步
     * 已删除的接口权限将被标记为废弃
     *
     * @returns 同步结果
     */
    async syncApiPermissions(): Promise<{
        added: number;
        updated: number;
        deprecated: number;
        total: number;
    }> {
        // 获取所有去重后的权限列表
        const permissions = this.getApiPermissionsList();
        // 获取API路由列表，用于关联权限与API路径
        const apiRouters = this.getApiRouterList();

        let added = 0;
        let updated = 0;
        let deprecated = 0;

        // 收集当前所有有效的权限编码
        const currentPermissionCodes = new Set<string>();
        permissions.forEach((permission) => {
            currentPermissionCodes.add(permission.code);
        });

        // 获取数据库中所有权限
        const allDbPermissions = await this.permissionRepository.find({
            where: {
                isDeprecated: false, // 只获取未废弃的权限
            },
        });

        // 标记已不存在的API权限为废弃
        for (const dbPermission of allDbPermissions) {
            if (dbPermission.apiPath && !currentPermissionCodes.has(dbPermission.code)) {
                dbPermission.isDeprecated = true;
                dbPermission.name = `[废弃] ${dbPermission.name}`;
                await this.permissionRepository.save(dbPermission);

                // 处理菜单中引用了废弃权限的记录
                try {
                    // 查找引用了该权限的菜单
                    const menusWithDeprecatedPermission = await this.dataSource
                        .createQueryBuilder()
                        .select("menu")
                        .from("menus", "menu")
                        .where("menu.permissionCode = :permissionCode", {
                            permissionCode: dbPermission.code,
                        })
                        .getRawMany();

                    if (menusWithDeprecatedPermission.length > 0) {
                        // 清除菜单中对废弃权限的引用
                        const updateResult = await this.dataSource
                            .createQueryBuilder()
                            .update("menus")
                            .set({ permissionCode: null })
                            .where('"permissionCode" = :permissionCode', {
                                permissionCode: dbPermission.code,
                            })
                            .execute();

                        if (updateResult.affected > 0) {
                            this.logger.log(
                                `清除菜单中废弃权限的引用: ${dbPermission.code}, 影响 ${updateResult.affected} 条记录`,
                            );
                        }
                    }
                } catch (error) {
                    this.logger.error(
                        `清除菜单中废弃权限的引用失败: ${dbPermission.code}`,
                        error.stack,
                    );
                }

                // 删除角色与废弃权限的关联关系
                try {
                    // 获取角色-权限关联表的实际表名
                    const roleMetadata = this.dataSource.getMetadata("Role");
                    const relationMetadata =
                        roleMetadata.findRelationWithPropertyPath("permissions");
                    const junctionTableName = relationMetadata.joinTableName;

                    // 执行删除操作
                    const deleteResult = await this.dataSource
                        .createQueryBuilder()
                        .delete()
                        .from(junctionTableName)
                        .where("permission_id = :permissionId", {
                            permissionId: dbPermission.id,
                        })
                        .execute();

                    if (deleteResult.affected > 0) {
                        this.logger.log(
                            `删除角色与废弃权限的关联: ${dbPermission.code}, 影响 ${deleteResult.affected} 条记录`,
                        );
                    }
                } catch (error) {
                    this.logger.error(
                        `删除角色与废弃权限的关联失败: ${dbPermission.code}`,
                        error.stack,
                    );
                }

                deprecated++;
                this.logger.log(`标记权限为废弃: ${dbPermission.code}`);
            }
        }

        // 更新或添加新的API权限
        for (const permission of permissions) {
            // 查找与该权限关联的API路由
            const apiRouter = apiRouters.find((router) =>
                router.permissions.some((p) => p.code === permission.code),
            );

            // 如果没有找到关联的API路由，跳过此权限
            if (!apiRouter) {
                this.logger.warn(`未找到与权限 ${permission.code} 关联的API路由`);
                continue;
            }

            // 处理权限编码，去除前缀并提取分组和操作
            let codeWithoutPrefix = permission.code;
            if (permission.code.includes("@")) {
                const permissionCodeSplitRes = permission.code.split("@");
                codeWithoutPrefix = permissionCodeSplitRes[1];
            }

            // 从权限编码中提取分组和操作
            const parts = codeWithoutPrefix.split(":");
            const group = permission.group || parts[0] || "";
            const groupName = permission.groupName || "未知分组";

            const action = parts.length > 1 ? parts[1] : "";

            // 构建权限名称和描述
            const permissionName =
                permission.name || `${action} ${apiRouter.name || apiRouter.handler}`;
            const permissionDesc =
                permission.description ||
                `${apiRouter.name || apiRouter.handler} 的 ${action} 权限`;

            // 检查权限是否已存在（包括已废弃的权限）
            let existingPermission = await this.permissionRepository.findOne({
                where: { code: permission.code },
            });

            if (existingPermission) {
                // 更新权限信息
                existingPermission.apiPath = apiRouter.path;
                existingPermission.method = apiRouter.method;
                existingPermission.name = permissionName;
                existingPermission.description = permissionDesc;
                existingPermission.group = group;
                existingPermission.groupName = groupName;
                existingPermission.isDeprecated = false; // 确保权限不是废弃状态
                existingPermission.type = permission.type; // 设置权限类型

                await this.permissionRepository.save(existingPermission);
                updated++;
                this.logger.log(`更新权限: ${permission.code}`);
            } else {
                // 创建新权限
                await this.create({
                    code: permission.code,
                    name: permissionName,
                    description: permissionDesc,
                    group: group,
                    groupName: groupName,
                    apiPath: apiRouter.path,
                    method: apiRouter.method,
                    isDeprecated: false,
                    type: permission.type,
                });
                added++;
                this.logger.log(`新增权限: ${permission.code}`);
            }
        }

        this.logger.log(
            `权限同步完成: 新增 ${added} 个, 更新 ${updated} 个, 废弃 ${deprecated} 个, 总计 ${permissions.length} 个权限`,
        );
        return { added, updated, deprecated, total: permissions.length };
    }

    /**
     * 清理废弃的权限
     *
     * 删除标记为废弃的权限，并清理相关的角色关联和菜单引用
     *
     * @returns 清理结果
     */
    async cleanupDeprecatedPermissions(): Promise<{
        removed: number;
        menuUpdated: number;
    }> {
        // 获取所有废弃的权限
        const deprecatedPermissions = await this.permissionRepository.find({
            where: { isDeprecated: true },
        });

        let removed = 0;
        let menuUpdated = 0;

        for (const permission of deprecatedPermissions) {
            try {
                // 1. 先处理菜单中对该权限的引用
                // 获取菜单表的实际表名
                const menuMetadata = this.dataSource.getMetadata("Menu");
                const menuTableName = menuMetadata.tableName;

                const menuUpdateResult = await this.dataSource
                    .createQueryBuilder()
                    .update(menuTableName)
                    .set({ permissionCode: null })
                    .where('"permissionCode" = :permissionCode', {
                        permissionCode: permission.code,
                    })
                    .execute();

                if (menuUpdateResult.affected > 0) {
                    menuUpdated += menuUpdateResult.affected;
                    this.logger.log(
                        `清除菜单中废弃权限的引用: ${permission.code}, 影响 ${menuUpdateResult.affected} 条记录`,
                    );
                }

                // 2. 删除角色与权限的关联关系
                // 获取角色-权限关联表的实际表名
                const roleMetadata = this.dataSource.getMetadata("Role");
                const relationMetadata = roleMetadata.findRelationWithPropertyPath("permissions");
                const junctionTableName = relationMetadata.joinTableName;

                await this.dataSource
                    .createQueryBuilder()
                    .delete()
                    .from(junctionTableName)
                    .where("permission_id = :permissionId", {
                        permissionId: permission.id,
                    })
                    .execute();

                // 3. 最后删除权限本身
                await this.permissionRepository.remove(permission);
                removed++;

                this.logger.log(`删除废弃权限: ${permission.code}`);
            } catch (error) {
                this.logger.error(`删除废弃权限失败: ${permission.code}`, error.stack);
                throw HttpErrorFactory.internal(`删除废弃权限失败: ${permission.code}`);
            }
        }

        this.logger.log(`清理废弃权限完成: 删除 ${removed} 个权限, 更新 ${menuUpdated} 个菜单引用`);
        return { removed, menuUpdated };
    }

    /**
     * 将HTTP方法从枚举值转换为字符串
     *
     * @param method HTTP方法枚举值
     * @returns HTTP方法字符串
     */
    private getHttpMethodString(method: RequestMethod | string): string {
        if (typeof method === "string") {
            return method.toUpperCase();
        }

        switch (method) {
            case RequestMethod.GET:
                return "GET";
            case RequestMethod.POST:
                return "POST";
            case RequestMethod.PUT:
                return "PUT";
            case RequestMethod.DELETE:
                return "DELETE";
            case RequestMethod.PATCH:
                return "PATCH";
            case RequestMethod.OPTIONS:
                return "OPTIONS";
            case RequestMethod.HEAD:
                return "HEAD";
            case RequestMethod.ALL:
                return "ALL";
            default:
                return "UNKNOWN";
        }
    }

    /**
     * 格式化方法名称为更友好的显示名称
     *
     * @param methodName 方法名称
     * @returns 格式化后的名称
     */
    private formatMethodName(methodName: string): string {
        // 将驼峰命名转换为空格分隔的单词并首字母大写
        const formatted = methodName
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

        return formatted;
    }
}
