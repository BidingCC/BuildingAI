import { BaseController } from "@buildingai/base";
import { Role } from "@buildingai/db/entities";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import {
    AssignPermissionsDto,
    CreateRoleDto,
    QueryRoleDto,
    UpdateRoleDto,
} from "@modules/role/dto";
import { RoleService } from "@modules/role/services/role.service";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

/**
 * 角色管理控制器
 *
 * 提供角色的增删改查等管理接口
 */
@ConsoleController("role", "系统角色")
export class RoleController extends BaseController {
    constructor(private readonly roleService: RoleService) {
        super();
    }

    /**
     * 创建角色
     *
     * @param createRoleDto 创建角色数据
     * @returns 创建的角色信息
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建角色",
        description: "创建新的角色信息",
    })
    async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
        return this.roleService.createRole(createRoleDto);
    }

    /**
     * 分页查询角色列表
     *
     * @param queryRoleDto 查询参数
     * @returns 分页角色列表
     */
    @Get()
    @BuildFileUrl(["**.avatar"])
    @Permissions({
        code: "list",
        name: "角色列表",
        description: "分页查询角色列表",
    })
    async findAll(@Query() queryRoleDto: QueryRoleDto) {
        return this.roleService.list(queryRoleDto);
    }

    /**
     * 查询全部角色列表（不分页）
     *
     * @param includeDisabled 是否包含禁用的角色
     * @returns 全部角色列表
     */
    @Get("all")
    @Permissions({
        code: "all",
        name: "全部角色",
        description: "查询全部角色列表",
    })
    async findAllRoles(): Promise<Role[]> {
        return this.roleService.all();
    }

    /**
     * 根据ID查询角色详情
     *
     * @param id 角色ID
     * @returns 角色详情
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "角色详情",
        description: "根据ID查询角色详情",
    })
    async findOne(@Param("id", UUIDValidationPipe) id: string): Promise<Role> {
        return this.roleService.findRoleById(id);
    }

    /**
     * 更新角色信息
     *
     * @param updateRoleDto 更新角色数据
     * @returns 更新后的角色信息
     */
    @Put()
    @Permissions({
        code: "update",
        name: "更新角色",
        description: "更新角色信息",
    })
    async update(@Body() updateRoleDto: UpdateRoleDto): Promise<Role> {
        return this.roleService.updateRoleById(updateRoleDto.id, updateRoleDto);
    }

    /**
     * 删除角色
     *
     * @param id 角色ID
     * @returns 操作结果
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除角色",
        description: "删除指定角色",
    })
    async remove(@Param("id", UUIDValidationPipe) id: string): Promise<void> {
        return this.roleService.remove(id);
    }

    /**
     * 为角色分配权限
     *
     * @param id 角色ID
     * @param assignPermissionsDto 权限分配数据
     * @returns 更新后的角色信息
     */
    @Put("/permissions")
    @Permissions({
        code: "assign-permissions",
        name: "分配角色权限",
        description: "为指定角色分配权限",
    })
    async assignPermissions(@Body() assignPermissionsDto: AssignPermissionsDto): Promise<Role> {
        return this.roleService.assignPermissions(assignPermissionsDto);
    }
}
