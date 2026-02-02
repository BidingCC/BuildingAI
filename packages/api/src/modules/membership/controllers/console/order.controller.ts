import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { QueryMembershipOrderDto } from "@modules/membership/dto/query-membership-order.dto";
import { MembershipOrderService } from "@modules/membership/services/order.service";
import { Body, Get, Param, Post, Query } from "@nestjs/common";

@ConsoleController("membership-order", "会员订单")
export class MembershipOrderController extends BaseController {
    constructor(private readonly membershipOrderService: MembershipOrderService) {
        super();
    }

    @Get()
    @Permissions({
        code: "list",
        name: "会员订单列表",
        description: "会员订单列表",
    })
    @BuildFileUrl(["**.avatar"])
    async lists(@Query() queryMembershipOrderDto: QueryMembershipOrderDto) {
        return await this.membershipOrderService.lists(queryMembershipOrderDto);
    }

    @Get(":id")
    @Permissions({
        code: "detail",
        name: "会员订单详情",
        description: "会员订单详情",
    })
    @BuildFileUrl(["**.avatar"])
    async detail(@Param("id") id: string) {
        return await this.membershipOrderService.detail(id);
    }

    @Post("refund")
    @Permissions({
        code: "refund",
        name: "会员订单退款",
        description: "会员订单退款",
    })
    async refund(@Body("id") id: string) {
        await this.membershipOrderService.refund(id);
        return { message: "退款成功" };
    }

    @Post("system-adjustment")
    @Permissions({
        code: "system-adjustment",
        name: "系统调整会员",
        description: "后台管理员调整用户会员等级",
    })
    async createSystemAdjustmentOrder(
        @Body()
        body: {
            userId: string;
            levelId: string | null;
            durationType: "1" | "3" | "12" | "forever" | "custom";
            customValue?: number;
            customUnit?: "day" | "month" | "year";
        },
    ) {
        return await this.membershipOrderService.createSystemAdjustmentOrder(
            body.userId,
            body.levelId,
            body.durationType,
            body.customValue,
            body.customUnit,
        );
    }
}
