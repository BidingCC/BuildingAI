import { BaseController } from "@buildingai/base";
import { type PayConfigType } from "@buildingai/constants/shared/payconfig.constant";
import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { WebController } from "@common/decorators/controller.decorator";
import { RechargeService } from "@modules/recharge/services/recharge.service";
import { Body, Get, Post, Query } from "@nestjs/common";

@WebController("recharge")
export class RechargeWebController extends BaseController {
    constructor(private readonly rechargeService: RechargeService) {
        super();
    }

    /**
     * 充值记录
     * @param paginationDto
     * @param user
     * @returns
     */
    @Get("lists")
    async lists(@Query() paginationDto: PaginationDto, @Playground() user: UserPlayground) {
        return await this.rechargeService.lists(paginationDto, user.id);
    }

    /**
     * 充值中心
     * @param user
     * @returns
     */
    @BuildFileUrl(["**.avatar", "**.logo"])
    @Get("center")
    async center(@Playground() user: UserPlayground) {
        return await this.rechargeService.center(user.id);
    }

    /**
     * 充值提交订单
     * @param id
     * @param payType
     * @param user
     * @returns
     */
    @Post("submitRecharge")
    async submitRecharge(
        @Body("id", UUIDValidationPipe) id: string,
        @Body("payType") payType: PayConfigType,
        @Playground() user: UserPlayground,
    ) {
        return await this.rechargeService.submitRecharge(id, payType, user.id, user.terminal);
    }
}
