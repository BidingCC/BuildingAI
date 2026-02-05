import { Cron } from "@buildingai/core/@nestjs/schedule";
import { MembershipOrderService } from "@modules/membership/services/order.service";
import { RechargeOrderService } from "@modules/recharge/services/recharge-order.service";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 充值/会员订单定时任务
 * - 每 1 分钟关闭超时未支付的充值订单
 * - 每 1 分钟关闭超时未支付的会员订单
 */
@Injectable()
export class OrderScheduleService {
    private readonly logger = new Logger(OrderScheduleService.name);

    constructor(
        private readonly rechargeOrderService: RechargeOrderService,
        private readonly membershipOrderService: MembershipOrderService,
    ) {}

    /**
     * 每 1 分钟执行：关闭超时未支付的充值订单
     */
    @Cron("*/1 * * * *", {
        name: "close-expired-recharge-orders",
        timeZone: "Asia/Shanghai",
    })
    async handleCloseExpiredRechargeOrders() {
        try {
            await this.rechargeOrderService.closeExpiredRechargeOrders();
        } catch (error) {
            this.logger.error(`关闭超时充值订单任务失败: ${(error as Error).message}`);
        }
    }

    /**
     * 每 1 分钟执行：关闭超时未支付的会员订单
     */
    @Cron("*/1 * * * *", {
        name: "close-expired-membership-orders",
        timeZone: "Asia/Shanghai",
    })
    async handleCloseExpiredMembershipOrders() {
        try {
            await this.membershipOrderService.closeExpiredMembershipOrders();
        } catch (error) {
            this.logger.error(`关闭超时会员订单任务失败: ${(error as Error).message}`);
        }
    }
}
