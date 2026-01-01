import { BaseService } from "@buildingai/base";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
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
import { PrepayDto } from "@modules/pay/dto/prepay.dto";
import { Injectable } from "@nestjs/common";
import { MoreThan, Repository } from "typeorm";

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
    ) {
        super(payconfigRepository);
    }

    /**
     * 预支付接口
     * @param prepayDto
     * @returns
     */
    async prepay(prepayDto: PrepayDto, userId: string) {
        const { orderId, payType, from } = prepayDto;
        let order: RechargeOrder | MembershipOrder | null = null;
        switch (from) {
            case "recharge":
                order = await this.rechargeOrderRepository.findOne({
                    where: {
                        id: orderId,
                        userId: userId,
                    },
                });
                if (!order) {
                    throw HttpErrorFactory.badRequest("充值订单不存在");
                }
                if (order.payStatus) {
                    throw HttpErrorFactory.badRequest("该订单已支付");
                }
                break;

            case "membership":
                order = await this.membershipOrderRepository.findOne({
                    where: {
                        id: orderId,
                        userId: userId,
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
                const qrCode = await this.wxpayService.createwxPayOrder(PayOrder);
                return { qrCode, payType };
            }
            case PayConfigPayType.ALIPAY: {
                const payForm = await this.alipayService.createWebPayOrder(PayOrder);
                return { payForm, payType };
            }
            default:
                throw HttpErrorFactory.badRequest("Not supported");
        }
    }

    /**
     * 获取支付状态
     * @param orderId
     * @param from
     * @returns
     */
    async getPayResult(orderId: string, from: string, userId: string) {
        let order: RechargeOrder | MembershipOrder | null = null;
        if ("recharge" == from) {
            order = await this.rechargeOrderRepository.findOne({
                where: {
                    id: orderId,
                    userId: userId,
                },
                select: ["id", "orderNo", "payStatus"],
            });
        } else if ("membership" == from) {
            order = await this.membershipOrderRepository.findOne({
                where: {
                    id: orderId,
                    userId: userId,
                },
                select: ["id", "orderNo", "payState"],
            });
        }
        return order;
    }

    /**
     * 微信回调解析参数
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

    /**
     * Alipay asynchronous callback processing
     *
     * Ref: https://opendocs.alipay.com/open/270/105902?pathHash=d5cd617e
     */
    async notifyAlipay(body: Record<string, any>) {
        try {
            const alipayService = await this.payfactoryService.getPayService(
                PayConfigPayType.ALIPAY,
            );

            const isValid = alipayService.checkNotifySign(body);
            if (!isValid) {
                throw new Error("Signature verification failed");
            }

            // Status: https://opendocs.alipay.com/open/270/105902?pathHash=d5cd617e#%E4%BA%A4%E6%98%93%E7%8A%B6%E6%80%81%E8%AF%B4%E6%98%8E
            const tradeStatus = body.trade_status;
            if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
                this.logger.warn("Abnormal transaction status");
                return;
            }

            // Get the business type (recharge or membership) from the passback_params field
            const method: "recharge" | "membership" = body.passback_params || body.attach;
            if (!method) {
                throw new Error("Business type parameter is missing");
            }

            // Maintain the same format as WeChat Pay
            const analysisParams: WechatPayNotifyAnalysisParams = {
                outTradeNo: body.out_trade_no,

                // The trade_no is similar to transaction_id
                transactionId: body.trade_no,

                attach: method,

                // 支付宝返回的是元，需要转换为分
                // eg: "100.00" yuan → 10000 fen
                amount: {
                    t: Math.round(parseFloat(body.total_amount) * 100),
                },

                payer: {
                    buyer_id: body.buyer_id,
                },
            };

            // method = "recharge", Call this.recharge()
            // method = "membership", Call this.membership()
            if ("function" === typeof this[method]) {
                await this[method](analysisParams);
            } else {
                throw new Error(`The ${method} method is undefined`);
            }
        } catch (error) {
            this.logger.error(`Alipay payment callback processing failed: ${error.message}`);
            throw error;
        }
    }

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
        //应该要走退款逻辑
        if (1 == order.payStatus) {
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
                payStatus: 1,
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
        if (1 == order.payState) {
            return;
        }

        await this.userRepository.manager.transaction(async (entityManager) => {
            // 更新订单表,标记已支付
            await entityManager.update(MembershipOrder, order.id, {
                payState: 1,
                status: 1,
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
}
