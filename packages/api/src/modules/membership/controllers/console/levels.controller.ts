import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { CreateLevelsDto } from "@modules/membership/dto/create-levels.dto";
import { QueryLevelsDto } from "@modules/membership/dto/query-levels.dto";
import { UpdateLevelsDto } from "@modules/membership/dto/update-levels.dto";
import { LevelsService } from "@modules/membership/services/levels.service";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

@ConsoleController("levels", "会员等级")
export class LevelsConsoleController extends BaseController {
    constructor(private readonly levelsService: LevelsService) {
        super();
    }

    /**
     * 分页查询会员等级列表
     *
     * @param queryLevelsDto 查询会员等级DTO
     * @returns 分页会员等级列表
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询会员等级列表",
        description: "分页查询会员等级列表",
    })
    @BuildFileUrl(["***.icon"])
    async findAll(@Query() queryLevelsDto: QueryLevelsDto) {
        return this.levelsService.list(queryLevelsDto);
    }

    /**
     * 获取会员等级列表全部
     *
     * @returns 会员等级列表
     */
    @Get("all")
    @Permissions({
        code: "all",
        name: "查询会员等级列表全部",
        description: "查询会员等级列表全部",
    })
    @BuildFileUrl(["***.icon"])
    async listAll() {
        return this.levelsService.findAll();
    }

    /**
     * 创建会员等级
     *
     * @param createLevelsDto 创建会员等级DTO
     * @returns 创建的会员等级
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建会员等级",
        description: "创建会员等级",
    })
    async create(@Body() createLevelsDto: CreateLevelsDto) {
        return this.levelsService.createLevel(createLevelsDto);
    }

    /**
     * 获取会员等级详情
     *
     * @param id 会员等级ID
     * @returns 会员等级详情
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "获取会员等级详情",
        description: "获取会员等级详情",
    })
    @BuildFileUrl(["icon", "benefits.*.icon"])
    async detail(@Param("id", UUIDValidationPipe) id) {
        return this.levelsService.detail(id);
    }

    /**
     * 更新会员等级信息
     *
     * @param updateLevelsDto 更新会员等级DTO
     * @returns 更新后的会员等级信息
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "更新会员等级",
        description: "更新会员等级",
    })
    async update(@Param("id", UUIDValidationPipe) id, @Body() updateLevelsDto: UpdateLevelsDto) {
        return this.levelsService.updateLevels(id, updateLevelsDto);
    }

    /**
     * 删除会员等级
     *
     * @param id 会员等级ID
     * @returns 删除后的会员等级
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除会员等级",
        description: "删除会员等级",
    })
    async delete(@Param("id", UUIDValidationPipe) id) {
        return this.levelsService.remove(id);
    }
}
