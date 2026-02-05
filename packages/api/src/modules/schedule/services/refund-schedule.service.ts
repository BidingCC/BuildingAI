import { Cron } from "@buildingai/core/@nestjs/schedule";
import { PayService } from "@modules/pay/services/pay.service";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 退款定时任务：对单笔退款记录，在该笔提交满 5 分钟后查询该笔的退款结果并更新表
 */
@Injectable()
export class RefundScheduleService {
    private readonly logger = new Logger(RefundScheduleService.name);

    constructor(private readonly payService: PayService) {}

    /**
     * 每 1 分钟执行：找出「退款中」且提交已满 5 分钟的单笔记录，逐笔查询该笔退款结果
     */
    @Cron("*/1 * * * *", {
        name: "sync-delayed-refund-results",
        timeZone: "Asia/Shanghai",
    })
    async handleSyncDelayedRefundResults() {
        try {
            await this.payService.syncDelayedRefundResults();
        } catch (error) {
            this.logger.error(`延时查询退款结果任务失败: ${(error as Error).message}`);
        }
    }
}
