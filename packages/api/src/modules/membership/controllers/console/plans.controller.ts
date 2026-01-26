import { BaseController } from "@buildingai/base";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { CreatePlansDto } from "@modules/membership/dto/create-plans.dto";
import { SetPlansDto } from "@modules/membership/dto/set-plans.dto";
import { UpdatePlansDto } from "@modules/membership/dto/update-plans.dto";
import { UpdatePlansSortDto } from "@modules/membership/dto/update-plans-sort.dto";
import { PlansService } from "@modules/membership/services/plans.service";
import { Body, Delete, Get, Param, Patch, Post } from "@nestjs/common";

@ConsoleController("plans", "会员计划")
export class PlansConsoleController extends BaseController {
    constructor(private readonly plansService: PlansService) {
        super();
    }

    /**
     * 获取订阅计划配置
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询订阅计划配置",
        description: "查询订阅计划配置",
    })
    async getConfig() {
        return this.plansService.getConfig();
    }

    /**
     * 新增订阅计划
     * @param createPlansDto 创建订阅计划DTO
     * @returns 创建的订阅计划
     */
    @Post()
    @Permissions({
        code: "create",
        name: "新增订阅计划",
        description: "新增订阅计划",
    })
    async create(@Body() createPlansDto: CreatePlansDto) {
        return this.plansService.createPlans(createPlansDto);
    }

    /**
     * 获取订阅计划详情
     * @param id 订阅计划ID
     * @returns 订阅计划详情
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查询订阅计划详情",
        description: "查询订阅计划详情",
    })
    async detail(@Param("id", UUIDValidationPipe) id) {
        return this.plansService.detail(id);
    }

    /**
     * 修改订阅计划
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "修改订阅计划",
        description: "修改订阅计划",
    })
    async update(@Param("id", UUIDValidationPipe) id, @Body() updatePlansDto: UpdatePlansDto) {
        return this.plansService.updatePlans(id, updatePlansDto);
    }

    /**
     * 修改订阅计划排序
     */
    @Patch("setPlanSort/:id")
    @Permissions({
        code: "updateSort",
        name: "修改订阅计划排序",
        description: "修改订阅计划排序",
    })
    async updateSort(
        @Param("id", UUIDValidationPipe) id,
        @Body() updatePlansSortDto: UpdatePlansSortDto,
    ) {
        return this.plansService.updateSort(id, updatePlansSortDto);
    }

    /**
     * 启用/禁用会员功能
     * @param setPlansDto 设置会员功能DTO
     * @returns 更新后的会员功能
     */
    @Post("setConfig")
    @Permissions({
        code: "setConfig",
        name: "启用/禁用会员功能",
        description: "启用/禁用会员功能",
    })
    async setStatus(@Body() setPlansDto: SetPlansDto) {
        return this.plansService.setConfig(setPlansDto);
    }

    /**
     * 启用/禁用订阅计划
     * @param id 订阅计划ID
     * @param setPlansDto 设置订阅计划DTO
     * @returns 更新后的订阅计划
     */
    @Post("setPlanStatus/:id")
    @Permissions({
        code: "setPlanStatus",
        name: "启用/禁用订阅计划",
        description: "启用/禁用订阅计划",
    })
    async setPlanStatus(@Param("id", UUIDValidationPipe) id, @Body() setPlansDto: SetPlansDto) {
        return this.plansService.setPlanStatus(id, setPlansDto);
    }

    /**
     * 删除订阅计划
     * @param id 订阅计划ID
     * @returns 删除后的订阅计划
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除订阅计划",
        description: "删除订阅计划",
    })
    async remove(@Param("id", UUIDValidationPipe) id) {
        return this.plansService.remove(id);
    }
}
