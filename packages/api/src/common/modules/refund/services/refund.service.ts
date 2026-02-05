import { BaseService } from "@buildingai/base";
import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { RefundStatus } from "@buildingai/constants/shared/payconfig.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { MembershipOrder, RechargeOrder, RefundLog } from "@buildingai/db/entities";
import { EntityManager, Repository } from "@buildingai/db/typeorm";
import { generateNo } from "@buildingai/utils";
import { OrderRefundParams } from "@common/interfaces/refund.interface";
import { AlipayService } from "@common/modules/pay/services/alipay.service";
import { WxPayService } from "@common/modules/pay/services/wxpay.service";
import { Injectable } from "@nestjs/common";

import { REFUND_ORDER_FROM } from "../constants/refund.constants";

@Injectable()
export class RefundService extends BaseService<RefundLog> {
    constructor(
        @InjectRepository(RefundLog)
        private readonly refundRepository: Repository<RefundLog>,
        private readonly wxpayService: WxPayService,
        private readonly alipayService: AlipayService,
    ) {
        super(refundRepository);
    }

    /**
     * 发起退款：先落库一条「退款中」日志，再调支付渠道接口；仅用同步返回更新第三方单号/报文，状态保持退款中（失败才置为退款失败，成功由异步回调更新）
     */
    async initiateRefund(orderRefundParams: OrderRefundParams) {
        const refundlog = await this.generateRefundLog(orderRefundParams);

        const { entityManager, payType, orderAmount } = orderRefundParams;
        switch (payType) {
            case PayConfigPayType.WECHAT: {
                const result = await this.wxpayService.refund({
                    out_refund_no: refundlog.refundNo,
                    out_trade_no: refundlog.orderNo,
                    amount: {
                        total: orderAmount,
                        refund: orderAmount,
                        currency: "CNY",
                    },
                });
                await this.updateRefundLogAfterApply(entityManager, refundlog, result || {});
                break;
            }
            case PayConfigPayType.ALIPAY: {
                const result = await this.alipayService.refund({
                    out_trade_no: refundlog.orderNo,
                    out_refund_no: refundlog.refundNo,
                    refund: orderAmount,
                    total: orderAmount,
                });
                await this.updateRefundLogAfterApply(entityManager, refundlog, result || {});
                break;
            }
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
            refundStatus: RefundStatus.ING,
            orderAmount,
            refundAmount,
        });
    }

    /**
     * 申请退款后更新退款日志：仅写入第三方单号与原始报文，状态固定为「退款中」
     * 同时将对应订单的 refundStatus 更新为「退款中」，便于订单列表展示；最终成功/失败由异步退款回调更新
     */
    async updateRefundLogAfterApply(
        entityManager: EntityManager,
        refundLog: RefundLog,
        refundRe: Record<string, any>,
    ) {
        const tradeNo = refundRe.refund_id ?? refundRe.trade_no;
        await entityManager.save(RefundLog, {
            id: refundLog.id,
            tradeNo,
            refundMsg: refundRe,
            refundStatus: RefundStatus.ING,
        });
        const from = (refundLog as RefundLog & { from?: number }).from;
        const orderRefundStatus = RefundStatus.ING;
        if (from === REFUND_ORDER_FROM.FROM_RECHARGE) {
            await entityManager.update(RechargeOrder, refundLog.orderId, {
                refundStatus: orderRefundStatus,
            });
        } else if (from === REFUND_ORDER_FROM.FROM_MEMBERSHIP) {
            await entityManager.update(MembershipOrder, refundLog.orderId, {
                refundStatus: orderRefundStatus,
            });
        }
    }
}
