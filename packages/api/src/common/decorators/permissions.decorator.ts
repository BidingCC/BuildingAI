import { PermissionType } from "@buildingai/db/entities";
import { applyDecorators, SetMetadata } from "@nestjs/common";

import { DECORATOR_KEYS } from "../constants/decorators-key.constant";

/**
 * 权限装饰器
 *
 * 用于标记控制器或路由处理程序需要的权限
 *
 * @param permissions 需要的权限列表
 * @returns 装饰器
 *
 * @example
 * ```typescript
 * @Permissions('users:create', 'users:edit')
 * @Post('users')
 * create(@Body() createUserDto: CreateUserDto) {
 *   return this.usersService.create(createUserDto);
 * }
 * ```
 */
/**
 * 权限装饰器参数接口
 */
export interface PermissionOptions {
    /**
     * 权限编码
     */
    code: string;

    /**
     * 权限名称
     */
    name: string;

    /**
     * 权限描述
     */
    description?: string;

    /**
     * 操作类型
     *
     * 例如："查看"、"创建"、"编辑"、"删除"等
     */
    action?: string;

    /**
     * 权限分组
     *
     * 用于在前端界面中对权限进行分类显示
     */
    group?: string;

    /**
     * 组名
     */
    groupName?: string;

    /**
     * 权限类型
     */
    type?: PermissionType;
}

/**
 * 权限装饰器
 *
 * 用于标记控制器或路由处理程序需要的权限
 * 此装饰器用于主程序控制器，会自动将权限类型设置为 SYSTEM
 *
 * @param permissions 权限列表，可以是字符串数组或权限选项对象数组
 * @returns 装饰器
 *
 * @example
 * ```typescript
 *
 * // 在方法上使用，只对特定方法进行权限控制
 * @ConsoleController('role', '角色管理')
 * export class RoleController {
 *   @Get()
 *   @Permissions({
 *     code: 'role:list',
 *     name: '角色列表',
 *     action: '查看'
 *   })
 *   findAll() {
 *     return this.roleService.findAll();
 *   }
 *
 *   @Post()
 *   @Permissions({
 *     code: 'role:create',
 *     name: '创建角色',
 *     action: '创建'
 *   })
 *   create(@Body() createRoleDto) {
 *     return this.roleService.create(createRoleDto);
 *   }
 * }
 * ```
 */
export const Permissions = (...permissions: PermissionOptions[]) => {
    permissions = permissions.map((item) => {
        item.type = PermissionType.SYSTEM;
        return item;
    });

    const decorators = [SetMetadata(DECORATOR_KEYS.PERMISSIONS_KEY, permissions)];

    return applyDecorators(...decorators);
};
