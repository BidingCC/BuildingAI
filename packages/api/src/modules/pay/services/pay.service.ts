import { BaseService } from "@buildingai/base";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import {
    OrderPayFrom,
    OrderPayFromType,
    PayConfigPayType,
    REFUND_QUERY_DELAY_MS,
} from "@buildingai/constants/shared/payconfig.constant";
import { RefundStatus } from "@buildingai/constants/shared/payconfig.constant";
import { OrderStatus, PayStatus } from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber, UserTerminal } from "@buildingai/constants/shared/status-codes.constant";
import { AppBillingService } from "@buildingai/core/modules";
import type { UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { RefundLog } from "@buildingai/db/entities";
import { MembershipOrder } from "@buildingai/db/entities";
import { UserSubscription } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    WechatPayNotifyAnalysisParams,
    WechatPayNotifyParams,
} from "@buildingai/wechat-sdk/interfaces/pay";
import { AlipayService } from "@common/modules/pay/services/alipay.service";
import { PayfactoryService } from "@common/modules/pay/services/payfactory.service";
import { WxPayService } from "@common/modules/pay/services/wxpay.service";
import { REFUND_ORDER_FROM } from "@common/modules/refund/constants/refund.constants";
import { PrepayDto } from "@modules/pay/dto/prepay.dto";
import { Injectable } from "@nestjs/common";
import { LessThanOrEqual, MoreThan, Repository } from "typeorm";
@Injectable()
export class PayService extends BaseService<Payconfig> {
    constructor(
        @InjectRepository(Payconfig)
        private readonly payconfigRepository: Repository<Payconfig>,
        @InjectRepository(RechargeOrder)
        private readonly rechargeOrderRepository: Repository<RechargeOrder>,
        private readonly wxpayService: WxPayService, // 注入wxpay服务
        private readonly alipayService: AlipayService, // 注入 alipay 服务
        private readonly payfactoryService: PayfactoryService,
        private readonly appBillingService: AppBillingService,
        @InjectRepository(MembershipOrder)
        private readonly membershipOrderRepository: Repository<MembershipOrder>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RefundLog)
        private readonly refundLogRepository: Repository<RefundLog>,
    ) {
        super(payconfigRepository);
    }

    // ---------- 支付配置与下单 ----------
    /**
     * 获取已启用的支付方式列表（供前端选择支付方式）
     * @param scene 支付场景：小程序(MP)、公众号(OA)环境下不返回支付宝
     * @returns 支付方式列表，不包含敏感配置
     */
    async getPayWayList(scene?: number): Promise<Partial<Payconfig>[]> {
        const list = await this.payconfigRepository.find({
            where: { isEnable: BooleanNumber.YES },
            select: ["id", "name", "payType", "logo", "sort", "isDefault"],
            order: { sort: "DESC" },
        });
        // 小程序、公众号环境不支持支付宝支付，过滤掉支付宝
        if (scene === UserTerminal.MP || scene === UserTerminal.OA) {
            return list.filter((item) => item.payType !== PayConfigPayType.ALIPAY);
        }
        return list;
    }

    /**
     * 预支付接口
     * @param prepayDto
     * @returns
     */
    async prepay(prepayDto: PrepayDto, user: UserPlayground) {
        const { orderId, payType, from, scene } = prepayDto;
        let order: RechargeOrder | MembershipOrder | null = null;
        switch (from) {
            case OrderPayFrom.RECHARGE:
                order = await this.rechargeOrderRepository.findOne({
                    where: {
                        id: orderId,
                        userId: user.id,
                    },
                });
                if (!order) {
                    throw HttpErrorFactory.badRequest("充值订单不存在");
                }
                if (order.payStatus) {
                    throw HttpErrorFactory.badRequest("该订单已支付");
                }
                break;

            case OrderPayFrom.MEMBERSHIP:
                order = await this.membershipOrderRepository.findOne({
                    where: {
                        id: orderId,
                        userId: user.id,
                    },
                });
                if (!order) {
                    throw HttpErrorFactory.badRequest("会员订单不存在");
                }
                if (order.payState) {
                    throw HttpErrorFactory.badRequest("该订单已支付");
                }
                break;
            default:
                throw HttpErrorFactory.badRequest("无效的订单来源");
        }
        const orderAmount = Number(order?.orderAmount || 0);
        // 统一支付订单
        const PayOrder = {
            orderSn: order.orderNo,
            payType,
            from,
            amount: orderAmount,
        };

        switch (payType) {
            case PayConfigPayType.WECHAT: {
                const result = await this.wxpayService.createwxPayOrder(PayOrder, scene, user);
                return result;
            }
            case PayConfigPayType.ALIPAY: {
                const payForm = await this.alipayService.createWebPayOrder(PayOrder);
                return { payForm, payType };
            }
            default:
                throw HttpErrorFactory.badRequest("Not supported");
        }
    }

    // ---------- 支付查询与关闭 ----------
    /**
     * 获取支付状态
     * 先查表，已支付则直接返回；未支付则按支付类型调微信/支付宝查询接口，若已支付则更新表并返回
     * @param orderId 订单 ID
     * @param from recharge | membership
     * @param userId 用户 ID
     */
    async getPayResult(orderId: string, from: OrderPayFromType | string, userId: string) {
        //如果支付回调正常，则已经更新了表，直接返回
        let order: RechargeOrder | MembershipOrder | null = null;
        if (from === OrderPayFrom.RECHARGE) {
            order = await this.rechargeOrderRepository.findOne({
                where: { id: orderId, userId },
                select: ["id", "orderNo", "payStatus", "payType", "terminal"],
            });
        } else if (from === OrderPayFrom.MEMBERSHIP) {
            order = await this.membershipOrderRepository.findOne({
                where: { id: orderId, userId },
                select: ["id", "orderNo", "payState", "payType", "terminal"],
            });
        }
        if (!order) return null;

        const isRecharge = from === OrderPayFrom.RECHARGE;
        const alreadyPaid = isRecharge
            ? (order as RechargeOrder).payStatus === PayStatus.PAID
            : (order as MembershipOrder).payState === PayStatus.PAID;
        if (alreadyPaid) return order;

        const orderNo = order.orderNo;
        const payType = order.payType;
        //如果支付回调失败，则查询支付结果
        try {
            if (payType === PayConfigPayType.WECHAT) {
                const result = await this.wxpayService.queryPayOrder(orderNo);
                const tradeState = result?.trade_state;
                if (tradeState === "SUCCESS") {
                    const analysisParams: WechatPayNotifyAnalysisParams = {
                        outTradeNo: orderNo,
                        transactionId: result.transaction_id ?? "",
                        attach: from,
                        amount: result.amount ?? { total: 0 },
                        payer: result.payer ?? {},
                    };
                    if (isRecharge) await this.recharge(analysisParams);
                    else await this.membership(analysisParams);
                    return await this.reloadOrder(orderId, from, userId);
                }
            } else if (payType === PayConfigPayType.ALIPAY) {
                const result = await this.alipayService.queryPayOrder(orderNo);
                const tradeStatus = result?.tradeStatus ?? result?.trade_status;
                if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
                    const transactionId = result?.tradeNo ?? result?.trade_no ?? "";
                    const analysisParams: WechatPayNotifyAnalysisParams = {
                        outTradeNo: orderNo,
                        transactionId,
                        attach: from,
                        amount: result?.totalAmount
                            ? { total: Math.round(Number(result.totalAmount) * 100) }
                            : { total: 0 },
                        payer: result?.buyerId ? { buyer_id: result.buyerId } : {},
                    };
                    if (isRecharge) await this.recharge(analysisParams);
                    else await this.membership(analysisParams);
                    return await this.reloadOrder(orderId, from, userId);
                }
            }
        } catch (err) {
            this.logger.warn(`getPayResult query remote failed: ${(err as Error).message}`);
        }
        return order;
    }

    /**
     * 关闭支付渠道订单（未支付订单），供业务层关闭订单时调用
     * @param orderNo 商户订单号
     * @param payType 支付类型（微信/支付宝）
     */
    async closePayOrder(orderNo: string, payType: number): Promise<void> {
        if (payType === PayConfigPayType.WECHAT) {
            await this.wxpayService.cancelPayOrder(orderNo);
        } else if (payType === PayConfigPayType.ALIPAY) {
            await this.alipayService.cancelPayOrder(orderNo);
        } else {
            throw new Error("不支持的支付类型");
        }
    }

    /** 重新查询订单并返回（用于查询到已支付后更新完表再返回） */
    private async reloadOrder(
        orderId: string,
        from: string,
        userId: string,
    ): Promise<RechargeOrder | MembershipOrder | null> {
        if (from === OrderPayFrom.RECHARGE) {
            return this.rechargeOrderRepository.findOne({
                where: { id: orderId, userId },
                select: ["id", "orderNo", "payStatus"],
            });
        }
        if (from === OrderPayFrom.MEMBERSHIP) {
            return this.membershipOrderRepository.findOne({
                where: { id: orderId, userId },
                select: ["id", "orderNo", "payState"],
            });
        }
        return null;
    }

    // ---------- 退款主动查询 ----------
    /**
     * 主动查询退款结果并同步：订单详情为「退款中」时调用，向支付渠道查询退款状态，若已成功则更新 RefundLog 并执行业务（订单状态、扣积分等）
     */
    async getRefundResult(
        orderId: string,
        _from: OrderPayFromType,
        _userId: string,
    ): Promise<void> {
        const refundLog = await this.refundLogRepository.findOne({
            where: { orderId },
            order: { createdAt: "DESC" },
        });
        if (!refundLog || refundLog.refundStatus !== RefundStatus.ING) {
            return;
        }
        try {
            if (refundLog.payType === PayConfigPayType.WECHAT) {
                const result = await this.wxpayService.queryRefundStatus(refundLog.refundNo);
                const status = result?.status;
                if (status === "SUCCESS") {
                    await this.refundLogRepository.update(refundLog.id, {
                        refundStatus: RefundStatus.SUCCESS,
                        refundMsg: result,
                    });
                    const rechargeOrder = await this.rechargeOrderRepository.findOne({
                        where: { id: orderId },
                    });
                    if (rechargeOrder) await this.handleRechargeRefundSuccess(refundLog);
                    else {
                        const membershipOrder = await this.membershipOrderRepository.findOne({
                            where: { id: orderId },
                        });
                        if (membershipOrder) await this.handleMembershipRefundSuccess(refundLog);
                    }
                } else if (status === "CLOSED" || status === "ABNORMAL") {
                    await this.refundLogRepository.update(refundLog.id, {
                        refundStatus: RefundStatus.FAILED,
                        refundMsg: result,
                    });
                }
            } else if (refundLog.payType === PayConfigPayType.ALIPAY) {
                const result = await this.alipayService.queryRefundStatus(
                    refundLog.orderNo,
                    refundLog.refundNo,
                );
                const code = result?.code;
                if (code === "10000") {
                    await this.refundLogRepository.update(refundLog.id, {
                        refundStatus: RefundStatus.SUCCESS,
                        refundMsg: result,
                    });
                    const rechargeOrder = await this.rechargeOrderRepository.findOne({
                        where: { id: orderId },
                    });
                    if (rechargeOrder) await this.handleRechargeRefundSuccess(refundLog);
                    else {
                        const membershipOrder = await this.membershipOrderRepository.findOne({
                            where: { id: orderId },
                        });
                        if (membershipOrder) await this.handleMembershipRefundSuccess(refundLog);
                    }
                } else if (code && code !== "10000") {
                    await this.refundLogRepository.update(refundLog.id, {
                        refundStatus: RefundStatus.FAILED,
                        refundMsg: result,
                    });
                }
            }
        } catch (err) {
            this.logger.warn(`getRefundResult query failed: ${(err as Error).message}`);
        }
    }

    /**
     * 定时任务：对单笔退款记录，在该笔提交满 REFUND_QUERY_DELAY_MS（5 分钟）后查询该笔的退款结果并更新表。
     * 每次仅处理「退款中」且 createdAt 已超过 5 分钟的记录，逐笔调用渠道查询。
     */
    async syncDelayedRefundResults(): Promise<void> {
        const deadline = new Date(Date.now() - REFUND_QUERY_DELAY_MS);
        const logs = await this.refundLogRepository.find({
            where: {
                refundStatus: RefundStatus.ING,
                createdAt: LessThanOrEqual(deadline),
            },
            select: ["id", "orderId", "userId", "from"],
        });
        if (logs.length === 0) return;
        this.logger.log(`退款提交满 5 分钟查询结果，本批 ${logs.length} 笔`);
        const fromMap: Record<number, OrderPayFromType> = {
            [REFUND_ORDER_FROM.FROM_RECHARGE]: OrderPayFrom.RECHARGE,
            [REFUND_ORDER_FROM.FROM_MEMBERSHIP]: OrderPayFrom.MEMBERSHIP,
        };
        for (const log of logs) {
            try {
                const fromStr = fromMap[log.from];
                if (!fromStr) continue;
                await this.getRefundResult(log.orderId, fromStr, log.userId);
            } catch (err) {
                this.logger.warn(
                    `单笔退款查询失败 orderId=${log.orderId}: ${(err as Error).message}`,
                );
            }
        }
    }

    // ---------- 微信支付回调 ----------
    /**
     * 微信支付回调 - 解析参数并分发到 recharge / membership
     * @param playload
     * @param body
     */
    async notifyWxPay(params: WechatPayNotifyParams, body: Record<string, any>) {
        try {
            const wechatPayService = await this.payfactoryService.getPayService(
                PayConfigPayType.WECHAT,
            );
            const result = await wechatPayService.notifyPay(params);
            if (!result) {
                throw new Error("验证签名失败");
            }
            const decryptBody = await this.wxpayService.decryptPayNotifyBody(body);

            const method = decryptBody.attach;
            const analysisParams: WechatPayNotifyAnalysisParams = {
                outTradeNo: decryptBody.out_trade_no,
                transactionId: decryptBody.transaction_id,
                attach: decryptBody.attach,
                payer: decryptBody.payer,
                amount: decryptBody.amount,
            };
            // 检查方法是否存在
            if ("function" === typeof this[method]) {
                await this[method](analysisParams); // 动态调用
            } else {
                throw new Error(`方法 ${method} 未定义`);
            }
        } catch (error) {
            this.logger.error(`微信支付回调处理失败: ${error.message}`);
            console.log(`微信支付回调处理失败: ${error.message}`);
        }
    }

    // ---------- 支付宝支付回调 ----------
    /**
     * 支付宝异步回调 - 仅验签（与微信一致：先验签并立即返回 200，应答后再处理业务）
     * @returns 验签是否通过
     */
    async verifyAlipayNotify(body: Record<string, any>): Promise<boolean> {
        const alipayService = await this.payfactoryService.getPayService(PayConfigPayType.ALIPAY);
        return alipayService.checkNotifySign(body);
    }

    /**
     * 支付宝异步回调 - 区分支付/退款并处理业务（在已应答 200 后异步执行）
     * 支付通知带 trade_status；退款通知带 gmt_refund 或 out_request_no（商户退款单号）
     * Ref: https://opendocs.alipay.com/open/270/105902
     */
    async processAlipayNotify(body: Record<string, any>): Promise<void> {
        try {
            const isRefundNotify =
                body.gmt_refund != null ||
                body.refund_fee != null ||
                (String(body.out_request_no ?? "").length > 0 && body.trade_status == null);
            if (isRefundNotify) {
                await this.processAlipayRefundNotify(body);
                return;
            }
            await this.processAlipayPayNotify(body);
        } catch (error) {
            this.logger.error(`支付宝回调业务处理失败: ${(error as Error).message}`);
        }
    }

    /**
     * 支付宝支付回调 - 业务处理（原 notifyAlipay 中的支付逻辑）
     * Ref: https://opendocs.alipay.com/open/270/105902#%E4%BA%A4%E6%98%93%E7%8A%B6%E6%80%81%E8%AF%B4%E6%98%8E
     */
    private async processAlipayPayNotify(body: Record<string, any>): Promise<void> {
        const tradeStatus = body.trade_status;
        if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
            this.logger.warn("支付宝支付通知异常状态");
            return;
        }
        const method: OrderPayFromType = body.passback_params || body.attach;
        if (!method) {
            this.logger.warn("支付宝支付通知缺少业务类型参数");
            return;
        }
        const analysisParams: WechatPayNotifyAnalysisParams = {
            outTradeNo: body.out_trade_no,
            transactionId: body.trade_no,
            attach: method,
            amount: {
                t: Math.round(parseFloat(body.total_amount || 0) * 100),
            },
            payer: { buyer_id: body.buyer_id },
        };
        if ("function" === typeof this[method]) {
            await this[method](analysisParams);
        }
    }

    // ---------- 支付成功业务（充值/会员，被回调与 getPayResult 调用） ----------
    /**
     * 充值回调
     * @param analysisParams
     * @returns
     */
    async recharge(analysisParams: WechatPayNotifyAnalysisParams) {
        const order = await this.rechargeOrderRepository.findOne({
            where: {
                orderNo: analysisParams.outTradeNo,
            },
        });
        if (!order) {
            return;
        }
        if (order.payStatus === PayStatus.PAID) {
            return;
        }
        const power = order.power;
        const givePower = order.givePower;
        await this.userRepository.manager.transaction(async (entityManager) => {
            if (power > 0) {
                await this.appBillingService.addUserPower(
                    {
                        amount: power,
                        accountType: ACCOUNT_LOG_TYPE.RECHARGE_INC,
                        userId: order.userId,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.RECHARGE,
                            source: "用户充值",
                        },
                        remark: `充值成功`,
                        associationNo: order.orderNo,
                    },
                    entityManager,
                );
            }
            if (givePower > 0) {
                await this.appBillingService.addUserPower(
                    {
                        amount: givePower,
                        accountType: ACCOUNT_LOG_TYPE.RECHARGE_GIVE_INC,
                        userId: order.userId,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.RECHARGE,
                            source: "用户充值",
                        },
                        remark: `用户充值赠送积分：${givePower}`,
                        associationNo: order.orderNo,
                    },
                    entityManager,
                );
            }
            //更新订单表，标记已支付
            await entityManager.update(RechargeOrder, order.id, {
                payStatus: PayStatus.PAID,
                orderStatus: OrderStatus.SUCCESS,
                payTime: new Date(),
                transactionId: analysisParams.transactionId,
            });
            //更新用户累计充值余额;
            await entityManager.increment(
                User,
                { id: order.userId },
                "totalRechargeAmount",
                power + givePower,
            );
        });
    }

    /**
     * 会员订单支付回调
     * @param analysisParams 微信支付回调解析参数
     * @returns
     */
    async membership(analysisParams: WechatPayNotifyAnalysisParams) {
        const order = await this.membershipOrderRepository.findOne({
            where: {
                orderNo: analysisParams.outTradeNo,
            },
        });
        if (!order) {
            return;
        }
        // 如果订单已支付,应该走退款逻辑
        if (order.payState === PayStatus.PAID) {
            return;
        }

        await this.userRepository.manager.transaction(async (entityManager) => {
            // 更新订单表,标记已支付
            await entityManager.update(MembershipOrder, order.id, {
                payState: PayStatus.PAID,
                status: OrderStatus.SUCCESS,
                payTime: new Date(),
                transactionId: analysisParams.transactionId,
            });

            // 计算订阅开始和结束时间
            const now = new Date();
            const planSnap = order.planSnap as any;
            const durationConfig = planSnap?.durationConfig;
            const duration = planSnap?.duration;

            // 查询用户当前该等级的最新有效订阅（用于时间叠加）
            const existingSubscription = await entityManager.findOne(UserSubscription, {
                where: {
                    userId: order.userId,
                    levelId: order.levelId,
                    endTime: MoreThan(now),
                },
                order: { endTime: "DESC" },
            });

            // 如果存在有效订阅，新订阅从现有订阅结束时间开始（时间叠加）
            // 否则从当前时间开始
            const startTime = existingSubscription ? new Date(existingSubscription.endTime) : now;
            let endTime = new Date(startTime);

            // 优先使用 durationConfig 枚举值
            if (durationConfig) {
                switch (durationConfig) {
                    case 1: // MONTH - 月度会员
                        endTime.setMonth(endTime.getMonth() + 1);
                        break;
                    case 2: // QUARTER - 季度会员
                        endTime.setMonth(endTime.getMonth() + 3);
                        break;
                    case 3: // HALF - 半年会员
                        endTime.setMonth(endTime.getMonth() + 6);
                        break;
                    case 4: // YEAR - 年度会员
                        endTime.setFullYear(endTime.getFullYear() + 1);
                        break;
                    case 5: // FOREVER - 终身会员
                        endTime.setFullYear(endTime.getFullYear() + 100);
                        break;
                    case 6: // CUSTOM - 自定义时长
                        if (duration && duration.value && duration.unit) {
                            switch (duration.unit) {
                                case "day":
                                case "天":
                                    endTime.setDate(endTime.getDate() + duration.value);
                                    break;
                                case "month":
                                case "月":
                                    endTime.setMonth(endTime.getMonth() + duration.value);
                                    break;
                                case "year":
                                case "年":
                                    endTime.setFullYear(endTime.getFullYear() + duration.value);
                                    break;
                                default:
                                    // 默认按月计算
                                    endTime.setMonth(endTime.getMonth() + duration.value);
                            }
                        } else {
                            // 自定义但没有 duration 信息,默认1个月
                            endTime.setMonth(endTime.getMonth() + 1);
                        }
                        break;
                    default:
                        // 未知配置,默认1个月
                        endTime.setMonth(endTime.getMonth() + 1);
                }
            } else {
                // 没有 durationConfig,默认1个月
                endTime.setMonth(endTime.getMonth() + 1);
            }

            // 如果存在有效订阅，更新结束时间（时长叠加）；否则创建新记录
            if (existingSubscription) {
                await entityManager.update(UserSubscription, existingSubscription.id, {
                    endTime,
                    orderId: order.id, // 更新为最新订单ID
                });
            } else {
                await entityManager.save(UserSubscription, {
                    userId: order.userId,
                    levelId: order.levelId,
                    orderId: order.id,
                    startTime,
                    endTime,
                    source: 1,
                });
            }

            // 立即赠送临时积分(过期时间为 30 天后)
            const levelSnap = order.levelSnap as any;
            const givePower = levelSnap?.givePower || 0;

            if (givePower > 0) {
                // 计算 30 天后作为过期时间
                const expireAt = this.getNext30Days(now);

                // 记录积分赠送日志(带过期时间)
                await this.appBillingService.addUserPower(
                    {
                        amount: givePower,
                        accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_INC,
                        userId: order.userId,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.MEMBERSHIP_GIFT,
                            source: "会员赠送",
                        },
                        remark: `购买会员赠送临时积分：${givePower}`,
                        associationNo: order.orderNo,
                        expireAt,
                    },
                    entityManager,
                );
            }
        });
    }

    /**
     * 获取 30 天后的时间
     * @param date 日期
     * @returns 30 天后的 0 点时间
     */
    private getNext30Days(date: Date): Date {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 30);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
    }

    // ---------- 微信退款回调 ----------
    /**
     * 微信退款回调 - 仅验签（文档要求 5 秒内应答，先验签再立即返回 200）
     * @returns 验签是否通过
     */
    async verifyWxRefundNotify(params: WechatPayNotifyParams): Promise<boolean> {
        const wechatPayService = await this.payfactoryService.getPayService(
            PayConfigPayType.WECHAT,
        );
        return wechatPayService.notifyPay(params);
    }

    /**
     * 微信退款回调 - 解密并处理业务（在已应答 200 后异步执行，避免超时重试）
     * 文档：应答后再处理业务逻辑，推荐异步处理
     */
    async processWxRefundNotify(body: Record<string, any>): Promise<void> {
        try {
            const decryptBody = await this.wxpayService.decryptPayNotifyBody(body);
            const { out_refund_no: outRefundNo, refund_status: refundStatus } = decryptBody;

            if (refundStatus !== "SUCCESS") {
                await this.refundLogRepository.update(
                    { refundNo: outRefundNo },
                    { refundStatus: RefundStatus.ING, refundMsg: decryptBody },
                );
                return;
            }
            const refundLog = await this.refundLogRepository.findOne({
                where: { refundNo: outRefundNo },
            });
            if (!refundLog || refundLog.refundStatus === RefundStatus.SUCCESS) {
                return;
            }
            // 先查订单：若订单已退款则不处理，避免重复
            const orderAlreadyRefunded = await this.isOrderRefunded(refundLog);
            if (orderAlreadyRefunded) {
                return;
            }
            await this.refundLogRepository.update(
                { id: refundLog.id },
                { refundStatus: RefundStatus.SUCCESS, refundMsg: decryptBody },
            );
            const from = refundLog.from;
            if (from === REFUND_ORDER_FROM.FROM_RECHARGE) {
                await this.handleRechargeRefundSuccess(refundLog);
            } else if (from === REFUND_ORDER_FROM.FROM_MEMBERSHIP) {
                await this.handleMembershipRefundSuccess(refundLog);
            }
        } catch (error) {
            this.logger.error(`微信退款回调业务处理失败: ${(error as Error).message}`);
        }
    }

    // ---------- 支付宝退款回调 ----------
    /**
     * 支付宝退款回调 - 业务处理（与 processWxRefundNotify 一致：更新 RefundLog 并处理订单）
     */
    async processAlipayRefundNotify(body: Record<string, any>): Promise<void> {
        const outRefundNo = body.out_request_no; // 商户退款单号，即 RefundLog.refundNo
        if (!outRefundNo) {
            this.logger.warn("支付宝退款通知缺少 out_request_no");
            return;
        }
        // 有 gmt_refund 表示退款成功；否则可能失败或处理中
        const isSuccess = body.gmt_refund != null && body.gmt_refund !== "";
        const refundLog = await this.refundLogRepository.findOne({
            where: { refundNo: outRefundNo },
        });
        if (!refundLog || refundLog.refundStatus === RefundStatus.SUCCESS) {
            return;
        }
        if (!isSuccess) {
            await this.refundLogRepository.update(
                { refundNo: outRefundNo },
                { refundStatus: RefundStatus.ING, refundMsg: body },
            );
            return;
        }
        // 先查订单：若订单已退款则不处理，避免重复
        const orderAlreadyRefunded = await this.isOrderRefunded(refundLog);
        if (orderAlreadyRefunded) {
            return;
        }
        await this.refundLogRepository.update(
            { id: refundLog.id },
            { refundStatus: RefundStatus.SUCCESS, refundMsg: body },
        );
        const from = refundLog.from;
        if (from === REFUND_ORDER_FROM.FROM_RECHARGE) {
            await this.handleRechargeRefundSuccess(refundLog);
        } else if (from === REFUND_ORDER_FROM.FROM_MEMBERSHIP) {
            await this.handleMembershipRefundSuccess(refundLog);
        }
    }

    // ---------- 退款私有方法（供退款回调与 getRefundResult 使用） ----------
    /**
     * 查询订单是否已退款（订单表 refundStatus 为已退款则返回 true）
     */
    private async isOrderRefunded(refundLog: RefundLog): Promise<boolean> {
        if (refundLog.from === REFUND_ORDER_FROM.FROM_RECHARGE) {
            const order = await this.rechargeOrderRepository.findOne({
                where: { id: refundLog.orderId },
                select: ["refundStatus"],
            });
            return order?.refundStatus === RefundStatus.SUCCESS;
        }
        if (refundLog.from === REFUND_ORDER_FROM.FROM_MEMBERSHIP) {
            const order = await this.membershipOrderRepository.findOne({
                where: { id: refundLog.orderId },
                select: ["refundStatus"],
            });
            return order?.refundStatus === RefundStatus.SUCCESS;
        }
        return false;
    }

    /**
     * 充值订单退款成功后的业务处理（在退款回调中执行）
     */
    private async handleRechargeRefundSuccess(refundLog: RefundLog) {
        const order = await this.rechargeOrderRepository.findOne({
            where: { id: refundLog.orderId },
        });
        if (!order || order.refundStatus === RefundStatus.SUCCESS) {
            return;
        }
        const totalPower = order.power + order.givePower;
        await this.userRepository.manager.transaction(async (entityManager) => {
            await entityManager.update(RechargeOrder, refundLog.orderId, {
                refundStatus: RefundStatus.SUCCESS,
            });
            await this.appBillingService.deductUserPower(
                {
                    userId: order.userId,
                    amount: totalPower,
                    accountType: ACCOUNT_LOG_TYPE.RECHARGE_DEC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.RECHARGE,
                        source: "充值订单",
                    },
                    remark: `充值订单退款，退款金额：${order.orderAmount}`,
                    associationNo: order.orderNo,
                },
                entityManager,
            );
        });
    }

    /**
     * 会员订单退款成功后的业务处理（在退款回调中执行）
     */
    private async handleMembershipRefundSuccess(refundLog: RefundLog) {
        const order = await this.membershipOrderRepository.findOne({
            where: { id: refundLog.orderId },
        });
        if (!order || order.refundStatus === RefundStatus.SUCCESS) {
            return;
        }
        const levelSnap = order.levelSnap as { givePower?: number } | null;
        const givePower = levelSnap?.givePower ?? 0;
        await this.userRepository.manager.transaction(async (entityManager) => {
            await entityManager.update(MembershipOrder, refundLog.orderId, {
                refundStatus: RefundStatus.SUCCESS,
            });
            await entityManager.delete(UserSubscription, { orderId: order.id });
            if (givePower > 0) {
                await this.appBillingService.deductUserPower(
                    {
                        userId: order.userId,
                        amount: givePower,
                        accountType: ACCOUNT_LOG_TYPE.MEMBERSHIP_GIFT_DEC,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.MEMBERSHIP_GIFT,
                            source: "会员退款扣除",
                        },
                        remark: `会员退款扣除赠送积分：${givePower}`,
                        associationNo: order.orderNo,
                    },
                    entityManager,
                );
            }
        });
    }
}
