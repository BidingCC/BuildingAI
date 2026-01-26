import { BaseService } from "@buildingai/base";
import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { RefundLog } from "@buildingai/db/entities";
import { EntityManager, Repository } from "@buildingai/db/typeorm";
import { generateNo } from "@buildingai/utils";
import { OrderRefundParams } from "@common/interfaces/refund.interface";
import { WxPayService } from "@common/modules/pay/services/wxpay.service";
import { Injectable } from "@nestjs/common";

import { REFUND_STATUS } from "../constants/refund.constants";

@Injectable()
export class RefundService extends BaseService<RefundLog> {
    constructor(
        @InjectRepository(RefundLog)
        private readonly refundRepository: Repository<RefundLog>,
        private readonly wxpayService: WxPayService,
    ) {
        super(refundRepository);
    }

    async initiateRefund(orderRefundParams: OrderRefundParams) {
        const refundlog = await this.generateRefundLog(orderRefundParams);

        const { entityManager, payType, orderAmount } = orderRefundParams;
        // 微信支付退款
        if (PayConfigPayType.WECHAT === payType) {
            const result = await this.wxpayService.refund({
                out_refund_no: refundlog.refundNo,
                out_trade_no: refundlog.orderNo,
                amount: {
                    total: orderAmount,
                    refund: orderAmount,
                    currency: "CNY",
                },
            });
            await this.updateRefundLog(entityManager, refundlog, result || {});
        }
    }

    /**
     * 生成退款日志
     * @param orderRefundParams
     * @returns
     */
    async generateRefundLog(orderRefundParams: OrderRefundParams) {
        const {
            entityManager,
            orderId,
            userId,
            orderNo,
            from,
            payType,
            transactionId,
            orderAmount,
            refundAmount,
        } = orderRefundParams;
        const refundNo = await generateNo(this.refundRepository, "refundNo");
        return entityManager.save(RefundLog, {
            orderId,
            userId,
            orderNo,
            from,
            payType,
            transactionId,
            refundNo,
            refundStatus: REFUND_STATUS.REFUND_ING,
            orderAmount,
            refundAmount,
        });
    }

    /**
     * 更新退款日志
     * @param refundLog
     * @param refundRe
     */
    async updateRefundLog(
        entityManager: EntityManager,
        refundLog: RefundLog,
        refundRe: Record<string, any>,
    ) {
        let refundStatus = refundLog.refundStatus;
        //微信退款
        if (PayConfigPayType.WECHAT === refundLog.payType) {
            if ("SUCCESS" == refundRe.status) {
                refundStatus = refundLog.refundStatus;
            } else if ("PROCESSING" !== refundRe.status) {
                refundStatus = REFUND_STATUS.REFUND_FAILED;
            }
        }
        await entityManager.save(RefundLog, {
            id: refundLog.id,
            tradeNo: refundRe.refund_id,
            refundMsg: refundRe,
            refundStatus: refundStatus,
        });
    }
}
