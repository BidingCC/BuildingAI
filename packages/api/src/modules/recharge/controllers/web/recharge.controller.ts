import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { WebController } from "@common/decorators/controller.decorator";
import { SubmitRechargeDto } from "@modules/recharge/dto/submit-recharge.dto";
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
     * @param submitRechargeDto
     * @param user
     * @returns
     */
    @Post("submitRecharge")
    async submitRecharge(
        @Body() submitRechargeDto: SubmitRechargeDto,
        @Playground() user: UserPlayground,
    ) {
        return await this.rechargeService.submitRecharge(
            submitRechargeDto.id,
            submitRechargeDto.payType,
            user.id,
            submitRechargeDto.scene,
        );
    }
}
