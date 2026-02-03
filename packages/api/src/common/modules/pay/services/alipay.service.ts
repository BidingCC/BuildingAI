import { PayConfigPayType } from "@buildingai/constants";
import { DictCacheService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { PayOrder } from "@common/interfaces/pay.interface";
import { PayfactoryService } from "@common/modules/pay/services/payfactory.service";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AlipayService {
    private readonly logger = new Logger(AlipayService.name);

    constructor(
        private readonly payfactoryService: PayfactoryService,
        private readonly dictCacheService: DictCacheService,
    ) {}

    async createWebPayOrder(payOrder: PayOrder) {
        try {
            const { orderSn, amount, from } = payOrder;

            if (amount <= 0) {
                throw new Error("The payment must be greater than 0");
            }

            const alipayService = await this.payfactoryService.getPayService(
                PayConfigPayType.ALIPAY,
            );

            const domain = process.env.APP_DOMAIN;

            if (!domain) {
                throw HttpErrorFactory.notFound("请先在.env中配置APP_DOMAIN");
            }

            const notifyUrl = `${domain}${process.env.VITE_APP_WEB_API_PREFIX}/pay/notifyAlipay`;

            return await alipayService.createWebPay({
                outTradeNo: orderSn,
                totalAmount: amount.toString(),
                // product name
                subject: from,
                body: `from:${from}`,
                passbackParams: from,
                timeoutExpress: "10m",
                notifyUrl,
            });
        } catch (error) {
            throw HttpErrorFactory.internal(`Payment order creation failed: ${error.message}`);
        }
    }

    async queryPayOrder(orderSn: string) {
        try {
            const alipayService = await this.payfactoryService.getPayService(
                PayConfigPayType.ALIPAY,
            );

            return await alipayService.query({ outTradeNo: orderSn });
        } catch (error) {
            throw HttpErrorFactory.internal(
                `Failed to query payment order status: ${error.message}`,
            );
        }
    }

    async cancelPayOrder(orderSn: string): Promise<any> {
        try {
            const alipayService = await this.payfactoryService.getPayService(
                PayConfigPayType.ALIPAY,
            );

            return await alipayService.close({ outTradeNo: orderSn });
        } catch (error) {
            throw HttpErrorFactory.internal(`Payment order cancellation failed: ${error.message}`);
        }
    }

    /**
     * Not needed yet
     */
    async decryptPayNotifyBody(body: Record<string, any>) {
        return body;
    }

    async refund(params: {
        out_trade_no: string;
        out_refund_no: string;
        refund: number;
        total: number;
        reason?: string;
    }): Promise<any> {
        try {
            const alipayService = await this.payfactoryService.getPayService(
                PayConfigPayType.ALIPAY,
            );

            return await alipayService.refund({
                outTradeNo: params.out_trade_no,
                refundAmount: (params.refund / 100).toFixed(2), // 分转元
                refundReason: params.reason || "User requests for refund",
                outRequestNo: params.out_refund_no,
            });
        } catch (error) {
            throw HttpErrorFactory.internal(`Refund application failed: ${error.message}`);
        }
    }

    async queryRefundStatus(outRefundNo: string, outRequestNo?: string): Promise<any> {
        try {
            const alipayService = await this.payfactoryService.getPayService(
                PayConfigPayType.ALIPAY,
            );

            return await alipayService.refundQuery(outRefundNo, outRequestNo);
        } catch (error) {
            throw HttpErrorFactory.internal(`Refund status query failed: ${error.message}`);
        }
    }

    private async getDomain(): Promise<string> {
        const config = await this.dictCacheService.getGroupValues<{
            domain?: string;
        }>("storage_config");
        return config?.domain || process.env.APP_DOMAIN || "";
    }
}
