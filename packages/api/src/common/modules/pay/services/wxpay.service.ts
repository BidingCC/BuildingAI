import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { UserTerminalType } from "@buildingai/constants/shared/status-codes.constant";
import { UserTerminal } from "@buildingai/constants/shared/status-codes.constant";
import type { UserPlayground } from "@buildingai/db";
import { DictCacheService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    WechatPayNotifyParams,
    WechatPayRefundParams,
} from "@buildingai/wechat-sdk/interfaces/pay";
import { PayOrder } from "@common/interfaces/pay.interface";
import { Injectable, Logger } from "@nestjs/common";

import { PayfactoryService } from "./payfactory.service";

/**
 * 支付服务
 *
 * 处理支付相关的业务逻辑，支持多种支付类型
 * 使用PayfactoryService管理支付服务实例
 *
 * 主要功能：
 * - 创建微信支付订单
 * - 查询支付订单状态
 * - 取消支付订单
 * - 处理支付回调
 * - 智能缓存管理
 */
@Injectable()
export class WxPayService {
    private readonly logger = new Logger(WxPayService.name);

    constructor(
        private readonly payfactoryService: PayfactoryService,
        private readonly dictCacheService: DictCacheService,
    ) {}

    /**
     * 创建微信支付订单
     *
     * 根据支付订单信息创建微信原生支付订单
     * 自动处理支付服务初始化、配置验证和错误处理
     *
     * @param payOrder 支付订单信息
     * @param payOrder.orderSn 订单编号，用于标识订单
     * @param payOrder.amount 支付金额（分）
     * @param payOrder.payType 支付类型
     * @param payOrder.from 支付来源（recharge/order）
     * @returns 支付订单创建结果，包含二维码URL
     * @throws 当订单创建失败时抛出异常
     */
    async createwxPayOrder(payOrder: PayOrder, scene: UserTerminalType, user?: UserPlayground) {
        try {
            const { orderSn, amount, from } = payOrder;
            // 通过工厂获取微信支付服务实例
            const wechatPayService = await this.payfactoryService.getPayService(
                PayConfigPayType.WECHAT,
                scene,
            );
            //创建jsapi订单
            if (scene === UserTerminal.MP || scene === UserTerminal.OA) {
                const result = await wechatPayService.createJsapiOrder({
                    out_trade_no: orderSn,
                    description: `from:${from}`,
                    payer: {
                        openid: scene === UserTerminal.MP ? user?.mp_openid : user?.openid,
                    },
                    amount: {
                        total: Number(amount),
                    },
                    attach: from,
                });
                return { ...result, payType: PayConfigPayType.WECHAT };
            }
            // 创建微信native支付订单
            if (scene === UserTerminal.PC) {
                const result = await wechatPayService.createNativeOrder({
                    out_trade_no: orderSn,
                    description: `from:${from}`,
                    amount: {
                        total: Number(amount),
                    },
                    attach: from,
                });
                return { qrCode: { code_url: result.code_url }, payType: PayConfigPayType.WECHAT };
            }
            this.logger.log(`微信支付订单创建成功: ${orderSn}`);
        } catch (error) {
            throw HttpErrorFactory.internal(`支付订单创建失败: ${error.message}`);
        }
    }

    /**
     * 关闭支付订单（未支付）
     * @param orderSn 商户订单号
     */
    async cancelPayOrder(orderSn: string): Promise<any> {
        try {
            const wechatPayService = await this.payfactoryService.getPayService(
                PayConfigPayType.WECHAT,
            );

            return await wechatPayService.closeOrder(orderSn);
        } catch (error) {
            throw HttpErrorFactory.internal(`关闭支付订单失败: ${error.message}`);
        }
    }

    /**
     * 查询支付订单状态
     *
     * 查询微信支付订单的当前状态
     * 返回订单的详细信息和支付状态
     *
     * 可能的订单状态：
     * - SUCCESS: 支付成功
     * - REFUND: 转入退款
     * - NOTPAY: 未支付
     * - CLOSED: 已关闭
     * - REVOKED: 已撤销
     * - USERPAYING: 用户支付中
     * - PAYERROR: 支付失败
     *
     * @param orderSn 订单编号
     * @returns 订单状态查询结果
     * @throws 当查询失败时抛出异常
     */
    async queryPayOrder(orderSn: string) {
        try {
            const wechatPayService = await this.payfactoryService.getPayService(
                PayConfigPayType.WECHAT,
            );
            const result = await wechatPayService.queryOrderStatus(orderSn);

            this.logger.log(`支付订单状态查询成功: ${orderSn}`);
            return result;
        } catch (error) {
            throw HttpErrorFactory.internal(`查询支付订单状态失败: ${error.message}`);
        }
    }

    /**
     * 解密回调消息体
     *
     * @param body 回调消息体
     * @returns 解密后的消息体
     */
    async decryptPayNotifyBody(body: Record<string, any>) {
        const wechatPayService = await this.payfactoryService.getPayService(
            PayConfigPayType.WECHAT,
        );
        const result = wechatPayService.decryptNotifyBody(body.resource);
        return result;
    }

    /**
     * 申请退款
     *
     * @param params 退款参数
     * @returns 退款结果
     */
    async refund(params: WechatPayRefundParams): Promise<any> {
        try {
            const wechatPayService = await this.payfactoryService.getPayService(
                PayConfigPayType.WECHAT,
            );
            const result = await wechatPayService.refund(params);

            this.logger.log("退款申请成功");
            return result;
        } catch (error) {
            throw HttpErrorFactory.internal(`退款申请失败: ${error.message}`);
        }
    }

    /**
     * 查询退款状态
     *
     * @param out_refund_no 退款单号
     * @returns 退款状态
     */
    async queryRefundStatus(out_refund_no: string): Promise<any> {
        try {
            const wechatPayService = await this.payfactoryService.getPayService(
                PayConfigPayType.WECHAT,
            );
            const result = await wechatPayService.queryRefundStatus(out_refund_no);
            return result;
        } catch (error) {
            throw HttpErrorFactory.internal(`退款状态查询失败: ${error.message}`);
        }
    }
}
