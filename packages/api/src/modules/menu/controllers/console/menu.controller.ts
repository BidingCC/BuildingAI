import { BaseController } from "@buildingai/base";
import { Menu } from "@buildingai/db/entities";
import { MenuSourceType } from "@buildingai/db/entities";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { BatchDeleteMenuDto, CreateMenuDto, QueryMenuDto, UpdateMenuDto } from "@modules/menu/dto";
import { MenuService } from "@modules/menu/services/menu.service";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

/**
 * 菜单控制器
 */
@ConsoleController("menu", "后台菜单")
export class MenuConsoleController extends BaseController {
    /**
     * 构造函数
     *
     * @param menuService 菜单服务
     */
    constructor(private readonly menuService: MenuService) {
        super();
    }

    /**
     * 创建菜单
     *
     * @param createMenuDto 创建菜单DTO
     * @returns 创建的菜单
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建菜单",
        description: "创建新的菜单项",
    })
    async create(@Body() createMenuDto: CreateMenuDto): Promise<Partial<Menu>> {
        return this.menuService.createMenu(createMenuDto);
    }

    /**
     * 分页查询菜单列表
     *
     * @param queryMenuDto 查询菜单DTO
     * @returns 分页菜单列表
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询菜单列表",
        description: "分页查询菜单列表",
    })
    async findAll(@Query() queryMenuDto: QueryMenuDto) {
        return this.menuService.list(queryMenuDto);
    }

    /**
     * 获取菜单树
     *
     * @param sourceType 菜单来源类型，可选
     * @returns 菜单树
     */
    @Get("tree")
    @Permissions({
        code: "tree",
        name: "获取菜单树",
        description: "获取完整的菜单树结构",
    })
    async getMenuTree(@Query("sourceType") sourceType?: MenuSourceType) {
        return this.menuService.getMenuTree(sourceType);
    }

    /**
     * 根据ID查询菜单详情
     *
     * @param id 菜单ID
     * @returns 菜单详情
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查询菜单详情",
        description: "根据ID查询菜单详情",
    })
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        return this.menuService.findOneById(id);
    }

    /**
     * 更新菜单
     *
     * @param id 菜单ID
     * @param updateMenuDto 更新菜单DTO
     * @returns 更新后的菜单
     */
    @Put(":id")
    @Permissions({
        code: "update",
        name: "更新菜单",
        description: "更新现有菜单信息",
    })
    async update(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() updateMenuDto: UpdateMenuDto,
    ) {
        return this.menuService.updateMenuById(id, updateMenuDto);
    }

    /**
     * 删除菜单
     *
     * @param id 菜单ID
     * @returns 操作结果
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除菜单",
        description: "删除现有菜单",
    })
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        // 检查是否有子菜单
        const children = await this.menuService.list({
            parentId: id,
            page: 1,
            pageSize: 1,
        });

        if (children.total > 0) {
            return {
                success: false,
                message: "该菜单下存在子菜单，无法删除",
            };
        }

        await this.menuService.delete(id);
        return {
            success: true,
            message: "删除成功",
        };
    }

    /**
     * 批量删除菜单
     *
     * @param batchDeleteMenuDto 批量删除菜单DTO
     * @returns 操作结果
     */
    @Post("batch-delete")
    @Permissions({
        code: "delete",
        name: "批量删除菜单",
        description: "批量删除菜单",
    })
    async batchRemove(@Body() batchDeleteMenuDto: BatchDeleteMenuDto) {
        await this.menuService.batchDelete(batchDeleteMenuDto.ids);
        return {
            success: true,
            message: "批量删除成功",
        };
    }
}
