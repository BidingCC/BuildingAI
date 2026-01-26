import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Menu, MenuSourceType, MenuType } from "@buildingai/db/entities";
import { Permission, PermissionType } from "@buildingai/db/entities";
import { Role } from "@buildingai/db/entities";
import { Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { CreateMenuDto, QueryMenuDto, UpdateMenuDto } from "@modules/menu/dto";
import { initJsonMenu } from "@modules/menu/interfaces/menu.interface";
import { Injectable } from "@nestjs/common";

/**
 * 菜单服务
 */
@Injectable()
export class MenuService extends BaseService<Menu> {
    /**
     * 构造函数
     */
    constructor(
        @InjectRepository(Menu)
        private readonly menuRepository: Repository<Menu>,
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) {
        super(menuRepository);
    }

    /**
     * 创建菜单
     *
     * @param createMenuDto 创建菜单DTO
     * @returns 创建的菜单
     */
    async createMenu(createMenuDto: CreateMenuDto): Promise<Partial<Menu>> {
        // 检查权限编码是否存在
        if (createMenuDto.permissionCode) {
            const permission = await this.permissionRepository.findOne({
                where: {
                    code: createMenuDto.permissionCode,
                    isDeprecated: false,
                },
            });

            if (!permission) {
                throw HttpErrorFactory.badRequest(
                    `权限编码 ${createMenuDto.permissionCode} 不存在`,
                );
            }
        }

        // 检查父级菜单是否存在
        if (createMenuDto.parentId) {
            const parentMenu = await this.menuRepository.findOne({
                where: { id: createMenuDto.parentId },
            });

            if (!parentMenu) {
                throw HttpErrorFactory.badRequest(`父级菜单 ${createMenuDto.parentId} 不存在`);
            }
        }

        // 创建菜单
        return super.create(createMenuDto);
    }

    /**
     * 更新菜单
     *
     * @param id 菜单ID
     * @param updateMenuDto 更新菜单DTO
     * @returns 更新后的菜单
     */
    async updateMenuById(id: string, updateMenuDto: UpdateMenuDto): Promise<Partial<Menu>> {
        // 检查菜单是否存在
        const menu = await this.menuRepository.findOne({
            where: { id },
        });

        if (!menu) {
            throw HttpErrorFactory.notFound(`菜单 ${id} 不存在`);
        }

        // 检查权限编码是否存在
        if (updateMenuDto.permissionCode) {
            const permission = await this.permissionRepository.findOne({
                where: {
                    code: updateMenuDto.permissionCode,
                    isDeprecated: false,
                },
            });

            if (!permission) {
                throw HttpErrorFactory.badRequest(
                    `权限编码 ${updateMenuDto.permissionCode} 不存在`,
                );
            }
        }

        if (!updateMenuDto.parentId) {
            updateMenuDto.parentId = null;
        }

        // 检查父级菜单是否存在
        if (updateMenuDto.parentId) {
            // 不能将自己设为自己的父级
            if (updateMenuDto.parentId === id) {
                throw HttpErrorFactory.badRequest("不能将自己设为自己的父级菜单");
            }

            const parentMenu = await this.menuRepository.findOne({
                where: { id: updateMenuDto.parentId },
            });

            if (!parentMenu) {
                throw HttpErrorFactory.badRequest(`父级菜单 ${updateMenuDto.parentId} 不存在`);
            }

            // 检查是否形成循环引用
            let currentParentId = parentMenu.parentId;
            while (currentParentId) {
                if (currentParentId === id) {
                    throw HttpErrorFactory.badRequest("不能将子菜单设为父级菜单，这会导致循环引用");
                }

                const parent = await this.menuRepository.findOne({
                    where: { id: currentParentId },
                });

                if (!parent) {
                    break;
                }

                currentParentId = parent.parentId;
            }
        }

        // 更新菜单
        return super.updateById(id, updateMenuDto);
    }

    /**
     * 查询菜单列表
     *
     * @param queryMenuDto 查询菜单DTO
     * @returns 菜单列表和分页信息
     */
    async list(queryMenuDto: QueryMenuDto) {
        const { name, type, parentId, sourceType } = queryMenuDto;

        // 构建查询条件
        const where: any = {};

        if (name) {
            where.name = Like(`%${name}%`);
        }

        if (type !== undefined) {
            where.type = type;
        }

        if (parentId !== undefined) {
            where.parentId = parentId;
        }

        if (sourceType !== undefined) {
            where.sourceType = sourceType;
        }

        // 查询菜单列表
        return this.paginate(queryMenuDto, {
            where,
            order: { sort: "DESC", createdAt: "DESC" },
        });
    }

    /**
     * 获取菜单树
     *
     * @param sourceType 菜单来源类型，可选
     * @returns 菜单树
     */
    async getMenuTree(sourceType?: MenuSourceType): Promise<Menu[]> {
        // 构建查询条件
        const where: any = {};

        if (sourceType !== undefined) {
            where.sourceType = sourceType;
        }

        // 查询所有菜单
        const menus = await this.menuRepository.find({
            where,
            order: { sort: "ASC", createdAt: "DESC" },
        });

        // 构建菜单树
        return this.buildMenuTree(menus);
    }

    /**
     * 根据用户权限获取菜单树
     *
     * @param permissionCodes 用户权限码列表，空数组表示超级管理员，返回全部菜单
     * @param sourceType 菜单来源类型，可选
     * @returns 根据权限筛选后的菜单树
     */
    async getMenuTreeByPermissions(
        permissionCodes: string[],
        sourceType?: MenuSourceType,
    ): Promise<Menu[]> {
        // 构建查询条件
        const where: any = {};

        if (sourceType !== undefined) {
            where.sourceType = sourceType;
        }

        // 查询所有菜单
        const allMenus = await this.menuRepository.find({
            where,
            order: { sort: "ASC", createdAt: "DESC" },
        });

        // 如果权限码列表为空，表示超级管理员，返回全部菜单
        if (permissionCodes.length === 0) {
            return this.buildMenuTree(allMenus);
        }

        // 根据权限筛选菜单
        const filteredMenus = allMenus.filter((menu) => {
            // 如果菜单没有权限要求，或者用户有该菜单的权限，则保留
            return !menu.permissionCode || permissionCodes.includes(menu.permissionCode);
        });

        // 收集所有筛选后的菜单ID，用于后续找出父菜单
        const filteredMenuIds = new Set(filteredMenus.map((menu) => menu.id));

        // 找出所有筛选菜单的父菜单，确保菜单树结构完整
        const menuIdsWithParents = new Set(filteredMenuIds);

        // 递归添加所有父菜单ID
        const addParentMenuIds = (menuId: string) => {
            const menu = allMenus.find((m) => m.id === menuId);
            if (menu && menu.parentId) {
                menuIdsWithParents.add(menu.parentId);
                addParentMenuIds(menu.parentId);
            }
        };

        // 对每个筛选出的菜单，添加其父菜单
        filteredMenus.forEach((menu) => {
            if (menu.parentId) {
                addParentMenuIds(menu.parentId);
            }
        });

        // 根据收集到的所有菜单ID（包括父菜单）筛选菜单
        const menusWithParents = allMenus.filter((menu) => menuIdsWithParents.has(menu.id));

        // 构建菜单树
        const menuTree = this.buildMenuTree(menusWithParents);

        // 递归检查并过滤没有菜单类型子项的组别或目录
        const filterEmptyGroupsAndDirectories = (menus: Menu[]): Menu[] => {
            return menus.filter((menu) => {
                // 如果是菜单或按钮类型，直接保留
                if (menu.type === MenuType.MENU || menu.type === MenuType.BUTTON) {
                    return true;
                }

                // 如果是组别或目录类型
                if (menu.type === MenuType.GROUP || menu.type === MenuType.DIRECTORY) {
                    // 如果有子菜单，递归过滤
                    if (menu.children && menu.children.length > 0) {
                        // 递归过滤子菜单
                        const filteredChildren = filterEmptyGroupsAndDirectories(menu.children);
                        menu.children = filteredChildren;

                        // 如果过滤后还有子菜单，或者至少有一个子菜单是菜单类型，则保留该组别或目录
                        return (
                            filteredChildren.length > 0 &&
                            filteredChildren.some(
                                (child) =>
                                    child.type === MenuType.MENU ||
                                    (child.children &&
                                        child.children.some(
                                            (grandChild) => grandChild.type === MenuType.MENU,
                                        )),
                            )
                        );
                    }
                    // 没有子菜单，则过滤掉
                    return false;
                }

                return true;
            });
        };

        // 过滤没有菜单类型子项的组别或目录
        return filterEmptyGroupsAndDirectories(menuTree);
    }

    /**
     * 初始化菜单数据
     *
     * @param menuData 菜单数据数组
     * @param userId 用户ID
     * @returns 初始化结果
     */
    async initMenu(menuData: initJsonMenu[], userId: string): Promise<Menu[]> {
        // 查找 app-center 父级菜单
        const appCenterMenu = await this.menuRepository.findOne({
            where: { code: "app-center" },
        });

        if (!appCenterMenu) {
            throw HttpErrorFactory.notFound("应用中心菜单(app-center)不存在");
        }

        const createdMenus: Menu[] = [];

        // 处理每个菜单项
        for (const item of menuData) {
            const processedItem = item;

            // 生成唯一的 code
            const menuCode =
                processedItem.code || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // 构建菜单数据
            const menuDto: CreateMenuDto = {
                name: processedItem.name,
                path: processedItem.path,
                icon: processedItem.icon,
                component: processedItem.component,
                permissionCode: processedItem.permissionCode,
                sort: processedItem.sort || 0,
                isHidden: processedItem.isHidden,
                type: processedItem.type,
                sourceType: processedItem.sourceType,
                parentId: appCenterMenu.id, // 设置父级菜单为 app-center
                code: menuCode,
            };

            try {
                // 检查菜单是否已存在
                const existingMenu = menuCode
                    ? await this.menuRepository.findOne({
                          where: { code: menuCode },
                      })
                    : null;

                let menu: Menu;
                if (existingMenu) {
                    // 更新已存在的菜单
                    menu = await this.updateMenuForInit(existingMenu.id, menuDto, userId);
                    this.logger.log(`更新菜单: ${menu.name}`);
                } else {
                    // 创建新菜单
                    menu = await this.createMenuForInit(menuDto, userId);
                    this.logger.log(`创建菜单: ${menu.name}`);
                }

                createdMenus.push(menu);

                // 递归处理子菜单
                if (processedItem.children && processedItem.children.length > 0) {
                    for (const child of processedItem.children) {
                        const processedChild = child;

                        // 为子菜单生成唯一的 code
                        const childMenuCode =
                            processedChild.code ||
                            `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                        // 构建子菜单数据
                        const childMenuDto: CreateMenuDto = {
                            name: processedChild.name,
                            path: processedChild.path,
                            icon: processedChild.icon,
                            component: processedChild.component,
                            permissionCode: processedChild.permissionCode,
                            sort: processedChild.sort || 0,
                            isHidden: processedChild.isHidden,
                            type: processedChild.type,
                            sourceType: processedChild.sourceType,
                            parentId: menu.id, // 设置父级为当前创建的菜单
                            code: childMenuCode,
                        };

                        // 检查子菜单是否已存在
                        const existingChildMenu = childMenuCode
                            ? await this.menuRepository.findOne({
                                  where: { code: childMenuCode },
                              })
                            : null;

                        if (existingChildMenu) {
                            // 更新已存在的子菜单
                            const updatedChildMenu = await this.updateMenuForInit(
                                existingChildMenu.id,
                                childMenuDto,
                                userId,
                            );
                            this.logger.log(`更新子菜单: ${updatedChildMenu.name}`);
                            createdMenus.push(updatedChildMenu);
                        } else {
                            // 创建新子菜单
                            const newChildMenu = await this.createMenuForInit(childMenuDto, userId);
                            this.logger.log(`创建子菜单: ${newChildMenu.name}`);
                            createdMenus.push(newChildMenu);
                        }
                    }
                }
            } catch (error) {
                this.logger.error(`初始化菜单失败: ${processedItem.name}`, error.message);
                throw HttpErrorFactory.internal(`初始化菜单失败: ${error.message}`);
            }
        }

        return createdMenus;
    }

    /**
     * 专门用于菜单初始化的创建方法，直接操作数据库而不通过 BaseService 的 create 方法
     * @param menuDto 菜单数据
     * @returns 创建的菜单实体
     */
    private async createMenuForInit(menuDto: CreateMenuDto, userId: string): Promise<Menu> {
        // 如果有权限编码，先检查权限是否存在，不存在则创建
        if (menuDto.permissionCode) {
            await this.ensurePermissionExists(menuDto.permissionCode, menuDto.name, userId);
        }

        // 创建菜单实体
        const menu = new Menu();
        Object.assign(menu, menuDto);

        // 保存到数据库
        return await this.menuRepository.save(menu);
    }

    /**
     * 专门用于菜单初始化的更新方法，直接操作数据库而不通过 BaseService 的 updateById 方法
     * @param id 菜单ID
     * @param menuDto 菜单数据
     * @returns 更新后的菜单实体
     */
    private async updateMenuForInit(
        id: string,
        menuDto: CreateMenuDto,
        userId: string,
    ): Promise<Menu> {
        // 查找现有菜单
        const existingMenu = await this.menuRepository.findOne({
            where: { id },
        });
        if (!existingMenu) {
            throw HttpErrorFactory.notFound(`菜单不存在: ${id}`);
        }

        // 如果有权限编码，先检查权限是否存在，不存在则创建
        if (menuDto.permissionCode) {
            await this.ensurePermissionExists(menuDto.permissionCode, menuDto.name, userId);
        }

        // 更新菜单实体
        Object.assign(existingMenu, menuDto);

        // 保存到数据库
        return await this.menuRepository.save(existingMenu);
    }

    /**
     * 确保权限存在，如果不存在则创建
     * @param code 权限编码
     * @param name 权限名称（取自菜单名称）
     */
    private async ensurePermissionExists(
        code: string,
        name: string,
        userId: string,
    ): Promise<void> {
        // 查找权限是否存在
        const permission = await this.permissionRepository.findOne({
            where: { code },
        });

        // 如果权限不存在，则创建
        if (!permission) {
            this.logger.log(`创建权限: ${code}`);
            const newPermission = new Permission();
            newPermission.code = code;
            newPermission.name = `${name}权限`;
            newPermission.description = `菜单 ${name} 的访问权限`;
            newPermission.type = PermissionType.PLUGIN; // 插件权限

            // 保存新权限
            const savedPermission = await this.permissionRepository.save(newPermission);

            // 查找用户及其角色
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: ["role"],
            });

            if (user && user.role) {
                // 查找角色的完整信息，包括已有权限
                const role = await this.roleRepository.findOne({
                    where: { id: user.role.id },
                    relations: ["permissions"],
                });

                if (role) {
                    // 将新权限添加到角色的权限列表中
                    if (!role.permissions) {
                        role.permissions = [];
                    }

                    // 检查权限是否已存在于角色中
                    const permissionExists = role.permissions.some(
                        (p) => p.id === savedPermission.id,
                    );

                    if (!permissionExists) {
                        // 添加新权限到角色
                        role.permissions.push(savedPermission);

                        // 保存更新后的角色
                        await this.roleRepository.save(role);
                        this.logger.log(`已将权限 ${code} 分配给角色 ${role.name}`);
                    }
                }
            }
        }
    }

    /**
     * 批量删除菜单
     *
     * @param ids 菜单ID数组
     * @returns 删除结果
     */
    async batchDelete(ids: string[]): Promise<void> {
        // 检查是否有子菜单
        for (const id of ids) {
            const children = await this.menuRepository.find({
                where: { parentId: id },
            });

            if (children.length > 0) {
                const menu = await this.menuRepository.findOne({
                    where: { id },
                });
                throw HttpErrorFactory.badRequest(
                    `菜单"${menu?.name || id}"下存在子菜单，无法删除`,
                );
            }
        }

        // 批量删除
        await this.deleteMany(ids);
    }

    /**
     * 构建菜单树
     *
     * @param menus 菜单列表
     * @param parentId 父级菜单ID
     * @returns 菜单树
     */
    private buildMenuTree(menus: Menu[], parentId: string | null = null): Menu[] {
        const result: Menu[] = [];

        // 如果没有指定 parentId，则找出根节点
        if (parentId === null) {
            // 找出在当前菜单列表中没有父级菜单的菜单作为根节点
            const menuIds = new Set(menus.map((menu) => menu.id));
            const rootMenus = menus.filter(
                (menu) => menu.parentId === null || !menuIds.has(menu.parentId),
            );

            // 递归构建每个根节点的子树
            for (const rootMenu of rootMenus) {
                const children = this.buildMenuTree(menus, rootMenu.id);
                if (children.length > 0) {
                    rootMenu.children = children;
                }
                result.push(rootMenu);
            }
        } else {
            // 找出当前层级的菜单
            const currentLevelMenus = menus.filter((menu) => menu.parentId === parentId);

            // 递归构建子菜单
            for (const menu of currentLevelMenus) {
                const children = this.buildMenuTree(menus, menu.id);
                if (children.length > 0) {
                    menu.children = children;
                }
                result.push(menu);
            }
        }

        return result;
    }
}
