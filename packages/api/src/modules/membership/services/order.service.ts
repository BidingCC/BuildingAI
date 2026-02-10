import { BaseService } from "@buildingai/base";
import { PayConfigPayType, PayConfigType } from "@buildingai/constants";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import {
    OrderPayFrom,
    OrderStatus,
    PAY_TIMEOUT,
    PayStatus,
    RefundStatus,
} from "@buildingai/constants/shared/payconfig.constant";
import {
    UserTerminal,
    UserTerminalDescMap,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { MembershipLevels, MembershipOrder, MembershipPlans } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { RefundLog } from "@buildingai/db/entities";
import { UserSubscription } from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { generateNo } from "@buildingai/utils";
import { REFUND_ORDER_FROM } from "@common/modules/refund/constants/refund.constants";
import { RefundService } from "@common/modules/refund/services/refund.service";
import { PayService } from "@modules/pay/services/pay.service";
import { Injectable } from "@nestjs/common";
import { In, LessThanOrEqual, Repository } from "typeorm";

import { QueryMembershipOrderDto } from "../dto/query-membership-order.dto";

/**
 * 订阅来源枚举
 */
const SUBSCRIPTION_SOURCE = {
    /** 系统赠送/系统调整 */
    SYSTEM: 0,
    /** 订单购买 */
    ORDER: 1,
    /** 系统调整 */
    SYSTEM_ADJUSTMENT: 2,
} as const;

/**
 * 订阅来源描述映射
 */
const SUBSCRIPTION_SOURCE_DESC: Record<number, string> = {
    [SUBSCRIPTION_SOURCE.SYSTEM]: "系统赠送",
    [SUBSCRIPTION_SOURCE.ORDER]: "订单购买",
    [SUBSCRIPTION_SOURCE.SYSTEM_ADJUSTMENT]: "系统调整",
};

/**
 * 用户订单列表项
 * @description 用于用户端展示的简化订单信息
 */
export interface UserOrderListItem {
    /** 订单ID */
    id: string;
    /** 订单号 */
    orderNo: string;
    /** 套餐名称 */
    planName: string;
    /** 等级名称 */
    levelName: string;
    /** 订阅时长描述 */
    duration: string;
    /** 订单金额 */
    orderAmount: number;
    /** 支付方式 */
    payType: PayConfigType;
    /** 支付方式描述 */
    payTypeDesc: string;
    /** 退款状态 */
    refundStatus: number;
    /** 创建时间 */
    createdAt: Date;
    /** 订单来源 */
    source: number;
    /** 订单来源描述 */
    sourceDesc: string;
    /** 等级快照 */
    levelSnap?: {
        id: string;
        name: string;
        icon?: string | null;
        level: number;
    };
}

@Injectable()
export class MembershipOrderService extends BaseService<MembershipOrder> {
    constructor(
        @InjectRepository(MembershipOrder)
        private readonly membershipOrderRepository: Repository<MembershipOrder>,
        @InjectRepository(Payconfig)
        private readonly payconfigRepository: Repository<Payconfig>,
        @InjectRepository(RefundLog)
        private readonly refundLogRepository: Repository<RefundLog>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(MembershipPlans)
        private readonly membershipPlansRepository: Repository<MembershipPlans>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        private readonly refundService: RefundService,
        private readonly dictService: DictService,
        private readonly appBillingService: AppBillingService,
        private readonly payService: PayService,
    ) {
        super(membershipOrderRepository);
    }

    /**
     * 会员订单列表
     * @param queryMembershipOrderDto 查询参数
     * @returns 订单列表及统计信息
     */
    async lists(queryMembershipOrderDto: QueryMembershipOrderDto) {
        const { orderNo, userKeyword, startTime, endTime, payType, payStatus, refundStatus } =
            queryMembershipOrderDto;
        const queryBuilder = this.membershipOrderRepository.createQueryBuilder("membership-order");
        queryBuilder.leftJoin("membership-order.user", "user");

        // 只查询订单来源为订单购买（source = 1）的订单
        queryBuilder.andWhere("membership-order.source = :source", { source: 1 });

        if (orderNo) {
            queryBuilder.andWhere("membership-order.orderNo ILIKE :orderNo", {
                orderNo: `%${orderNo}%`,
            });
        }
        if (userKeyword) {
            queryBuilder.andWhere(
                "(user.username ILIKE :userKeyword OR user.phone ILIKE :userKeyword)",
                {
                    userKeyword: `%${userKeyword}%`,
                },
            );
        }
        if (startTime) {
            queryBuilder.andWhere("membership-order.createdAt >= :startTime", {
                startTime,
            });
        }
        if (endTime) {
            queryBuilder.andWhere("membership-order.createdAt <= :endTime", {
                endTime,
            });
        }
        if (payType) {
            queryBuilder.andWhere("membership-order.payType = :payType", {
                payType,
            });
        }
        // 使用 != null 以便传入 0（未支付/未退款）时也能正确筛选
        if (payStatus != null) {
            queryBuilder.andWhere("membership-order.payState = :payState", {
                payStatu: payStatus,
            });
        }
        if (refundStatus != null) {
            queryBuilder.andWhere("membership-order.refundStatus = :refundStatus", {
                refundStatus,
            });
        }

        queryBuilder.select([
            "membership-order.id",
            "membership-order.orderNo",
            "membership-order.planId",
            "membership-order.levelId",
            "membership-order.payType",
            "membership-order.payState",
            "membership-order.status",
            "membership-order.refundStatus",
            "membership-order.totalAmount",
            "membership-order.duration",
            "membership-order.payTime",
            "membership-order.createdAt",
            "membership-order.orderAmount",
            "membership-order.source",
            "user.nickname",
            "user.avatar",
        ]);

        const payWayList = await this.payconfigRepository.find({
            select: ["name", "payType"],
        });
        queryBuilder.orderBy("membership-order.createdAt", "DESC");
        const orderLists = await this.paginateQueryBuilder(queryBuilder, queryMembershipOrderDto);

        // 收集所有 planId 和 levelId 用于批量查询
        const planIds = [...new Set(orderLists.items.map((o) => o.planId).filter(Boolean))];
        const levelIds = [...new Set(orderLists.items.map((o) => o.levelId).filter(Boolean))];

        // 批量查询套餐和等级信息
        const plans =
            planIds.length > 0
                ? await this.membershipPlansRepository.find({
                      where: { id: In(planIds) },
                      select: ["id", "name", "label"],
                  })
                : [];
        const levels =
            levelIds.length > 0
                ? await this.membershipLevelsRepository.find({
                      where: { id: In(levelIds) },
                      select: ["id", "name", "level", "icon"],
                  })
                : [];

        // 构建映射
        const planMap = new Map(plans.map((p) => [p.id, p] as const));
        const levelMap = new Map(levels.map((l) => [l.id, l] as const));

        // 组装返回数据
        const items = orderLists.items.map((order) => {
            const payTypeDesc = payWayList.find((item) => item.payType == order.payType)?.name;
            const payStateDesc = order.payState == PayStatus.PAID ? "已支付" : "未支付";
            const refundStateDesc =
                order.refundStatus === RefundStatus.SUCCESS
                    ? "已退款"
                    : order.refundStatus === RefundStatus.ING
                      ? "退款中"
                      : "未退款";
            const plan = planMap.get(order.planId) || null;
            const level = levelMap.get(order.levelId) || null;

            // 移除 planId 和 levelId，替换为 plan 和 level 对象；status 以 orderStatus 返回与充值订单一致
            const { planId: _planId, levelId: _levelId, ...rest } = order;
            return {
                ...rest,
                plan,
                level,
                payTypeDesc,
                payStateDesc,
                refundStateDesc,
                orderStatus: order.status,
            };
        });

        // 统计只统计订单来源为订单购买（source = 1）的订单
        const totalOrder = await this.membershipOrderRepository.count({
            where: { payState: 1, source: 1 },
        });
        const totalAmount =
            (await this.membershipOrderRepository.sum("orderAmount", {
                payState: PayStatus.PAID,
                source: 1,
            })) || 0;
        const totalRefundOrder = await this.membershipOrderRepository.count({
            where: { refundStatus: 1, source: 1 },
        });
        const totalRefundAmount =
            (await this.membershipOrderRepository.sum("orderAmount", {
                refundStatus: RefundStatus.SUCCESS,
                source: 1,
            })) || 0;

        // 使用整数计算避免浮点数精度问题（乘以 100 转为分，计算后再转回元）
        const totalIncome = Math.round((totalAmount - totalRefundAmount) * 100) / 100;
        const statistics = {
            totalOrder,
            totalAmount,
            totalRefundOrder,
            totalRefundAmount,
            totalIncome,
        };

        return {
            ...orderLists,
            items,
            extend: {
                statistics,
                payTypeLists: payWayList,
            },
        };
    }

    /**
     * 会员订单详情
     * @param id
     * @returns
     */
    async detail(id: string) {
        const queryBuilder = this.membershipOrderRepository.createQueryBuilder("membership-order");
        queryBuilder.leftJoin("membership-order.user", "user");
        queryBuilder.where("membership-order.id = :id", { id });
        queryBuilder.select([
            "membership-order.id",
            "membership-order.userId",
            "membership-order.orderNo",
            "membership-order.payType",
            "membership-order.payState",
            "membership-order.status",
            "membership-order.refundStatus",
            "membership-order.planSnap",
            "membership-order.levelSnap",
            "membership-order.totalAmount",
            "membership-order.duration",
            "membership-order.payTime",
            "membership-order.createdAt",
            "membership-order.orderAmount",
            "membership-order.terminal",
            "user.nickname",
            "user.avatar",
        ]);
        const detail = await queryBuilder.getOne();
        if (!detail) {
            throw HttpErrorFactory.badRequest("会员订单不存在");
        }
        let refundStatusDesc = "-";
        if (detail.refundStatus === RefundStatus.ING) {
            refundStatusDesc = "退款中";
        } else if (detail.refundStatus === RefundStatus.SUCCESS) {
            refundStatusDesc = "已退款";
        }
        const orderType = "会员订单";
        const payTypeDesc = await this.payconfigRepository.findOne({
            select: ["name"],
            where: {
                payType: detail.payType,
            },
        });
        let refundNo = "";
        if (
            detail.refundStatus === RefundStatus.ING ||
            detail.refundStatus === RefundStatus.SUCCESS
        ) {
            refundNo = (
                await this.refundLogRepository.findOne({
                    where: { orderId: detail.id },
                })
            )?.refundNo;
        }
        const terminalDesc =
            UserTerminalDescMap[detail.terminal] ?? UserTerminalDescMap[UserTerminal.PC];
        return {
            ...detail,
            orderType,
            refundStatusDesc,
            terminalDesc,
            refundNo,
            payTypeDesc: payTypeDesc.name,
            orderStatus: detail.status,
        };
    }

    /**
     * 查询支付结果并同步：向支付渠道查询订单支付状态，若已支付则更新订单与会员权益，返回最新详情
     */
    async syncPayResult(id: string) {
        const order = await this.membershipOrderRepository.findOne({
            where: { id },
            select: ["id", "userId", "payState"],
        });
        if (!order) throw HttpErrorFactory.badRequest("会员订单不存在");
        if (order.payState === 1) return this.detail(id);
        await this.payService.getPayResult(id, OrderPayFrom.MEMBERSHIP, order.userId);
        return this.detail(id);
    }

    /**
     * 查询退款结果并同步：退款中时向支付渠道查询退款状态，若已成功则更新订单与扣积分，返回最新详情
     */
    async syncRefundResult(id: string) {
        const order = await this.membershipOrderRepository.findOne({
            where: { id },
            select: ["id", "userId", "refundStatus"],
        });
        if (!order) throw HttpErrorFactory.badRequest("会员订单不存在");
        if (order.refundStatus !== RefundStatus.ING) return this.detail(id);
        await this.payService.getRefundResult(id, OrderPayFrom.MEMBERSHIP, order.userId);
        return this.detail(id);
    }

    /**
     * 定时任务：先查询支付结果并更新表，再关闭仍超时未支付的会员订单（创建时间超过 PAY_TIMEOUT 的待支付订单，仅订单购买 source=1）
     */
    async closeExpiredMembershipOrders(): Promise<void> {
        const deadline = new Date(Date.now() - PAY_TIMEOUT);
        const orders = await this.membershipOrderRepository.find({
            where: {
                source: SUBSCRIPTION_SOURCE.ORDER,
                payState: PayStatus.PENDING,
                status: OrderStatus.CREATED,
                createdAt: LessThanOrEqual(deadline),
            },
            select: ["id", "orderNo", "payType", "userId"],
        });
        if (orders.length === 0) return;
        this.logger.log(`处理超时会员订单，共 ${orders.length} 笔`);
        for (const order of orders) {
            try {
                const result = await this.payService.getPayResult(
                    order.id,
                    OrderPayFrom.MEMBERSHIP,
                    order.userId,
                );
                if (result && (result as MembershipOrder).payState === PayStatus.PAID) {
                    continue;
                }
                await this.payService.closePayOrder(order.orderNo, order.payType);
                await this.membershipOrderRepository.update(order.id, {
                    status: OrderStatus.CLOSED,
                });
            } catch (err) {
                this.logger.warn(
                    `关闭支付渠道订单失败 ${order.orderNo}: ${(err as Error).message}`,
                );
            }
        }
    }

    /**
     * 关闭订单（仅未支付订单）：关闭支付渠道订单并更新本地订单状态为已关闭
     * @param id 会员订单 ID
     */
    async closeOrder(id: string) {
        const order = await this.membershipOrderRepository.findOne({ where: { id } });
        if (!order) throw HttpErrorFactory.badRequest("会员订单不存在");
        if (order.payState !== PayStatus.PENDING) {
            throw HttpErrorFactory.badRequest("仅未支付订单可关闭");
        }

        try {
            await this.payService.closePayOrder(order.orderNo, order.payType);
        } catch (err) {
            throw HttpErrorFactory.badRequest(`关闭支付订单失败: ${(err as Error).message}`);
        }
        await this.membershipOrderRepository.update(id, {
            status: OrderStatus.CLOSED,
        });
    }

    /**
     * 会员订单退款
     * @param id 订单ID
     * @description 退款时会扣除购买会员时赠送的积分
     */
    async refund(id: string) {
        try {
            const order = await this.membershipOrderRepository.findOne({
                where: { id },
            });
            if (!order) {
                throw new Error("会员订单不存在");
            }
            if (0 == order.payState) {
                throw new Error("订单未支付,不能发起退款");
            }
            if (order.refundStatus === RefundStatus.SUCCESS) {
                throw new Error("订单已退款");
            }
            if (order.refundStatus === RefundStatus.ING) {
                throw new Error("订单退款处理中，请勿重复操作");
            }

            // 仅发起退款，不包事务；订单状态更新、删除订阅与扣积分在退款回调中处理
            await this.refundService.initiateRefund({
                entityManager: this.membershipOrderRepository.manager,
                orderId: order.id,
                userId: order.userId,
                orderNo: order.orderNo,
                from: REFUND_ORDER_FROM.FROM_MEMBERSHIP,
                payType: order.payType,
                transactionId: order.transactionId,
                orderAmount: order.orderAmount,
                refundAmount: order.orderAmount,
            });
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message);
        }
    }

    /**
     * 获取用户当前未过期的最高会员等级
     * @param userId 用户ID
     * @returns 用户当前最高等级信息，如果没有则返回 null
     */
    private async getUserCurrentHighestLevel(
        userId: string,
    ): Promise<{ level: number; name: string } | null> {
        const now = new Date();

        // 查询用户所有未过期的订阅记录，关联等级信息
        const subscriptions = await this.userSubscriptionRepository.find({
            where: { userId },
            relations: ["level"],
        });

        // 过滤出未过期且有等级信息的订阅
        const validSubscriptions = subscriptions.filter((sub) => sub.level && sub.endTime > now);

        if (validSubscriptions.length === 0) {
            return null;
        }

        // 找出最高等级
        const highestSubscription = validSubscriptions.reduce((prev, current) => {
            return (current.level?.level ?? 0) > (prev.level?.level ?? 0) ? current : prev;
        });

        return {
            level: highestSubscription.level!.level,
            name: highestSubscription.level!.name,
        };
    }

    /**
     * 提交会员订单
     * @param planId 套餐ID
     * @param levelId 等级ID
     * @param payType 支付类型
     * @param userId 用户ID
     * @param terminal 终端类型
     * @returns 订单信息
     */
    async submitOrder(
        planId: string,
        levelId: string,
        payType: PayConfigType,
        userId: string,
        terminal: UserTerminalType,
    ) {
        try {
            // 检查会员功能状态
            const membershipStatus = await this.dictService.get(
                "membership_plans_status",
                false,
                "membership_config",
            );
            if (false === membershipStatus) {
                throw HttpErrorFactory.badRequest("会员功能已关闭");
            }

            // 查询套餐信息
            const plan = await this.membershipPlansRepository.findOne({
                where: { id: planId, status: true },
            });
            if (!plan) {
                throw HttpErrorFactory.badRequest("会员套餐不存在或已下架");
            }

            // 查询等级信息
            const level = await this.membershipLevelsRepository.findOne({
                where: { id: levelId, status: true },
            });
            if (!level) {
                throw HttpErrorFactory.badRequest("会员等级不存在或已下架");
            }

            // 检查用户当前会员等级，高等级会员不能购买低等级
            const userCurrentHighestLevel = await this.getUserCurrentHighestLevel(userId);
            if (userCurrentHighestLevel && level.level < userCurrentHighestLevel.level) {
                throw HttpErrorFactory.badRequest(
                    `您当前是${userCurrentHighestLevel.name}，无法购买更低等级的会员`,
                );
            }

            // 从套餐的 billing 中找到对应等级的价格信息
            const billingItem = plan.billing?.find((item) => item.levelId === levelId);
            if (!billingItem || !billingItem.status) {
                throw HttpErrorFactory.badRequest("该等级在此套餐中不可用");
            }

            // 格式化会员时长（中文）
            let durationText = "";
            if (plan.duration?.value && plan.duration?.unit) {
                // 单位转中文
                const unitMap: Record<string, string> = {
                    day: "天",
                    天: "天",
                    month: "个月",
                    月: "个月",
                    year: "年",
                    年: "年",
                };
                const unitCn = unitMap[plan.duration.unit] || plan.duration.unit;
                durationText = `${plan.duration.value}${unitCn}`;
            } else {
                // 根据 durationConfig 生成默认文本
                const durationMap: Record<number, string> = {
                    1: "1个月",
                    2: "3个月",
                    3: "6个月",
                    4: "12个月",
                    5: "终身",
                    6: "自定义",
                };
                durationText = durationMap[plan.durationConfig] || "未知";
            }

            // 生成订单号
            const orderNo = await generateNo(this.membershipOrderRepository, "orderNo");

            // 创建订单快照(移除不必要的属性,避免循环引用)
            // 使用 JSON 序列化确保数据格式正确
            const planSnap = JSON.parse(
                JSON.stringify({
                    id: plan.id,
                    name: plan.name,
                    label: plan.label,
                    durationConfig: plan.durationConfig,
                    duration: plan.duration,
                    billing: plan.billing,
                    levelCount: plan.billing?.length ?? 0,
                    status: plan.status,
                    sort: plan.sort,
                }),
            );

            const levelSnap = JSON.parse(
                JSON.stringify({
                    id: level.id,
                    name: level.name,
                    level: level.level,
                    givePower: level.givePower,
                    status: level.status,
                    icon: level.icon,
                    description: level.description,
                    benefits: level.benefits,
                }),
            );

            // 创建订单（source = 1，订单购买）
            const membershipOrder = await this.membershipOrderRepository.save({
                userId,
                terminal,
                orderNo,
                planId: plan.id,
                levelId: level.id,
                planSnap,
                levelSnap,
                payType,
                duration: durationText,
                totalAmount: billingItem.originalPrice || 0,
                orderAmount: billingItem.salesPrice || 0,
                source: 1, // 订单购买
            });

            return {
                orderId: membershipOrder.id,
                orderNo,
                orderAmount: membershipOrder.orderAmount,
            };
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.message || "提交订单失败");
        }
    }

    /**
     * 用户订阅记录列表
     * @description 获取当前用户的会员订阅记录（仅已支付订单）
     * @param userId 用户ID
     * @param paginationDto 分页参数
     * @returns 订阅记录列表
     */
    async userOrderLists(
        userId: string,
        paginationDto: { page?: number; pageSize?: number; levelId?: string },
    ) {
        const queryBuilder = this.membershipOrderRepository.createQueryBuilder("membership-order");
        queryBuilder.where("membership-order.userId = :userId", { userId });
        queryBuilder.andWhere("membership-order.payState = :payState", { payState: 1 });
        if (paginationDto.levelId) {
            queryBuilder.andWhere("membership-order.levelId = :levelId", {
                levelId: paginationDto.levelId,
            });
        }
        queryBuilder.select([
            "membership-order.id",
            "membership-order.orderNo",
            "membership-order.payType",
            "membership-order.refundStatus",
            "membership-order.planSnap",
            "membership-order.levelSnap",
            "membership-order.duration",
            "membership-order.orderAmount",
            "membership-order.createdAt",
            "membership-order.source",
        ]);
        queryBuilder.orderBy("membership-order.createdAt", "DESC");

        const payWayList = await this.payconfigRepository.find({
            select: ["name", "payType"],
        });

        const orderLists = await this.paginateQueryBuilder(queryBuilder, paginationDto);
        const items: UserOrderListItem[] = orderLists.items.map((order) => {
            const payTypeDesc = payWayList.find((item) => item.payType == order.payType)?.name;
            const planSnap = order.planSnap as any;
            const levelSnap = order.levelSnap as any;
            return {
                id: order.id,
                orderNo: order.orderNo,
                planName: planSnap?.name || "-",
                levelName: levelSnap?.name || "-",
                duration: order.duration,
                orderAmount: order.orderAmount,
                payType: order.payType,
                payTypeDesc: payTypeDesc || "-",
                refundStatus: order.refundStatus,
                createdAt: order.createdAt,
                source: order.source,
                sourceDesc: SUBSCRIPTION_SOURCE_DESC[order.source] ?? "未知来源",
                levelSnap: levelSnap
                    ? {
                          id: levelSnap.id,
                          name: levelSnap.name,
                          icon: levelSnap.icon,
                          level: levelSnap.level,
                      }
                    : undefined,
            };
        });

        return {
            ...orderLists,
            items,
        };
    }

    /**
     * 获取用户订阅列表（同一等级只显示一条）
     * @description 按会员等级分组：同一等级的多条订阅（系统赠送/订单购买）合并为一条，开通时间取最早、到期时间取最晚
     * @param userId 用户ID
     * @param paginationDto 分页参数
     * @returns 按等级去重后的订阅列表，无订阅时返回空列表
     */
    async userSubscriptionLists(
        userId: string,
        paginationDto: { page?: number; pageSize?: number },
    ) {
        const page = paginationDto.page || 1;
        const pageSize = paginationDto.pageSize || 10;

        const subscriptions = await this.userSubscriptionRepository.find({
            where: { userId },
            relations: ["level"],
            select: ["id", "startTime", "endTime", "source", "orderId", "createdAt"],
            order: { createdAt: "ASC" },
        });

        if (subscriptions.length === 0) {
            return {
                items: [],
                total: 0,
                page,
                pageSize,
            };
        }

        const now = new Date();

        // 按 levelId 分组，同一等级只保留一条（开通时间最早、到期时间最晚）
        const groupByLevelId = new Map<
            string,
            {
                subs: (typeof subscriptions)[0][];
            }
        >();
        for (const sub of subscriptions) {
            const key = sub.level?.id ?? sub.levelId ?? "__null__";
            if (!groupByLevelId.has(key)) {
                groupByLevelId.set(key, { subs: [] });
            }
            groupByLevelId.get(key)!.subs.push(sub);
        }

        const orderIds = subscriptions.filter((s) => s.orderId).map((s) => s.orderId) as string[];
        const orderMap = new Map<string, { duration: string; refundStatus: number }>();
        if (orderIds.length > 0) {
            const orders = await this.membershipOrderRepository.find({
                where: { id: In(orderIds) },
                select: ["id", "duration", "refundStatus"],
            });
            orders.forEach((o) =>
                orderMap.set(o.id, { duration: o.duration, refundStatus: o.refundStatus ?? 0 }),
            );
        }

        const items: Array<{
            id: string;
            level: (typeof subscriptions)[0]["level"];
            startTime: Date;
            endTime: Date;
            source: number;
            sourceDesc: string;
            duration: string | null;
            refundStatus: number;
            isExpired: boolean;
            isActive: boolean;
            createdAt: Date;
        }> = [];

        for (const [, { subs }] of groupByLevelId) {
            const startTime = subs.reduce(
                (min, s) => (new Date(s.startTime) < new Date(min) ? s.startTime : min),
                subs[0].startTime,
            );
            const endTime = subs.reduce(
                (max, s) => (new Date(s.endTime) > new Date(max) ? s.endTime : max),
                subs[0].endTime,
            );
            const createdAt = subs.reduce(
                (min, s) => (new Date(s.createdAt) < new Date(min) ? s.createdAt : min),
                subs[0].createdAt,
            );
            // 代表该等级的订阅：取 endTime 最晚的那条用于 id / source / orderId
            const representative = subs.reduce((best, s) =>
                new Date(s.endTime) > new Date(best.endTime) ? s : best,
            );
            const level = representative.level;
            const sourceSet = new Set(subs.map((s) => s.source));
            let sourceDesc: string;
            if (!level) {
                sourceDesc = "系统调整";
            } else if (sourceSet.size > 1) {
                sourceDesc = "混合";
            } else {
                sourceDesc = SUBSCRIPTION_SOURCE_DESC[representative.source] ?? "未知来源";
            }
            const orderInfo = representative.orderId ? orderMap.get(representative.orderId) : null;
            const duration = orderInfo?.duration ?? null;
            const refundStatus = orderInfo?.refundStatus ?? 0;
            const isExpired = new Date(endTime) < now;

            items.push({
                id: representative.id,
                level,
                startTime,
                endTime,
                source: representative.source,
                sourceDesc,
                duration,
                refundStatus,
                isExpired,
                isActive: !isExpired,
                createdAt,
            });
        }

        // 排序：未过期在前，同状态按等级降序，再按创建时间倒序
        items.sort((a, b) => {
            if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
            const levelA = a.level?.level ?? 0;
            const levelB = b.level?.level ?? 0;
            if (levelA !== levelB) return levelB - levelA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const total = items.length;
        const start = (page - 1) * pageSize;
        const pagedItems = items.slice(start, start + pageSize);

        return {
            items: pagedItems,
            total,
            page,
            pageSize,
        };
    }

    /**
     * 获取用户订阅记录列表（包含订单购买和系统调整）
     * @description 直接查询订单表，返回订单完成（status = 1）且已付款（payState = 1）的订单记录
     * 根据订单的 source 字段区分来源：0-系统调整，1-订单购买
     * @param userId 用户ID
     * @param paginationDto 分页参数
     * @returns 订阅记录列表
     */
    async getUserPaidOrders(userId: string, paginationDto: { page?: number; pageSize?: number }) {
        const page = paginationDto.page || 1;
        const pageSize = paginationDto.pageSize || 10;

        // 查询订单完成且已付款的订单
        const queryBuilder = this.membershipOrderRepository.createQueryBuilder("order");
        queryBuilder.where("order.userId = :userId", { userId });
        queryBuilder.andWhere("order.payState = :payState", { payState: 1 }); // 已付款
        queryBuilder.andWhere("order.status = :status", { status: 1 }); // 订单完成
        queryBuilder.leftJoinAndSelect("order.subscriptions", "subscriptions");
        queryBuilder.leftJoinAndSelect("subscriptions.level", "level");
        queryBuilder.orderBy("order.createdAt", "DESC");
        queryBuilder.skip((page - 1) * pageSize);
        queryBuilder.take(pageSize);

        const [orders, total] = await queryBuilder.getManyAndCount();
        const now = new Date();

        // 格式化订单记录
        const items = orders.map((order) => {
            const levelSnap = order.levelSnap as any;
            const subscription = order.subscriptions?.[0]; // 获取订单对应的订阅记录

            // 根据订单的 source 字段确定来源
            // 注意：source 字段已添加到实体，如果 TypeScript 报错，需要重新编译
            const orderSource = (order as MembershipOrder & { source?: number }).source ?? 1; // 默认为订单购买
            const sourceDesc =
                orderSource === 0
                    ? SUBSCRIPTION_SOURCE_DESC[SUBSCRIPTION_SOURCE.SYSTEM]
                    : SUBSCRIPTION_SOURCE_DESC[SUBSCRIPTION_SOURCE.ORDER];

            // 计算订单的有效期（从订单支付时间开始，加上订单时长）
            const orderStartTime = order.payTime || order.createdAt;
            const orderEndTime = this.calculateOrderEndTime(orderStartTime, order.planSnap);

            // 处理取消会员的情况（levelId 为空或 levelSnap 为空）
            const level =
                subscription?.level ||
                (levelSnap?.id
                    ? {
                          id: levelSnap.id,
                          name: levelSnap.name,
                          icon: levelSnap.icon,
                          level: levelSnap.level,
                      }
                    : null);

            // 如果是取消会员的订单（duration 为 "取消会员"），endTime 应该为 null
            const finalEndTime =
                order.duration === "取消会员" ? null : subscription?.endTime || orderEndTime;

            return {
                id: subscription?.id || order.id,
                level,
                startTime: subscription?.startTime || orderStartTime,
                endTime: finalEndTime,
                source: orderSource,
                sourceDesc: order.duration === "取消会员" ? "系统调整（取消会员）" : sourceDesc,
                duration: order.duration,
                refundStatus: order.refundStatus,
                isExpired: finalEndTime ? finalEndTime < now : false,
                isActive: finalEndTime ? finalEndTime >= now : false,
                createdAt: order.createdAt,
                orderNo: order.orderNo,
                orderAmount: order.orderAmount,
            };
        });

        return {
            items,
            total,
            page,
            pageSize,
        };
    }

    /**
     * 创建系统调整订单
     * @description 后台管理员调整用户会员等级时，创建系统调整订单并更新订阅记录
     * @param userId 用户ID
     * @param levelId 会员等级ID（null表示取消会员）
     * @param durationType 时长类型：1-1个月，3-3个月，12-1年，forever-永久，custom-自定义
     * @param customValue 自定义时长数值（仅当durationType为custom时使用）
     * @param customUnit 自定义时长单位：day-天，month-月，year-年（仅当durationType为custom时使用）
     * @returns 创建的订单信息
     */
    async createSystemAdjustmentOrder(
        userId: string,
        levelId: string | null,
        durationType: "1" | "3" | "12" | "forever" | "custom",
        customValue?: number,
        customUnit?: "day" | "month" | "year",
    ) {
        return await this.membershipOrderRepository.manager.transaction(async (entityManager) => {
            const now = new Date();

            // 如果设置为普通用户（levelId为null），创建取消会员的订单记录
            if (!levelId) {
                // 查询用户当前的会员等级（用于订单快照）
                const currentSubscription = await entityManager.findOne(UserSubscription, {
                    where: { userId },
                    relations: ["level"],
                    order: { createdAt: "DESC" },
                });

                const levelSnap = currentSubscription?.level
                    ? JSON.parse(
                          JSON.stringify({
                              id: currentSubscription.level.id,
                              name: currentSubscription.level.name,
                              level: currentSubscription.level.level,
                              icon: currentSubscription.level.icon,
                          }),
                      )
                    : {};

                // 生成订单号
                const orderNo = await generateNo(this.membershipOrderRepository, "orderNo");

                // 创建取消会员的订单记录（系统调整，金额为0）
                // 注意：levelId 字段在实体中不允许为空，但取消会员时我们需要记录这个操作
                // 使用一个特殊值或者查询用户之前的等级ID
                const previousLevelId = currentSubscription?.levelId || "";

                const cancelOrder = await entityManager.save(MembershipOrder, {
                    userId,
                    orderNo,
                    levelId: previousLevelId, // 使用之前的等级ID（如果存在）
                    planId: "", // 系统调整没有套餐
                    planSnap: {},
                    levelSnap,
                    payType: PayConfigPayType.WECHAT, // 占位
                    duration: "取消会员",
                    totalAmount: 0,
                    orderAmount: 0,
                    payState: 1, // 已支付（系统调整直接生效）
                    status: 1, // 订单完成
                    payTime: now,
                    refundStatus: 0,
                    source: 0, // 系统调整
                });

                // 删除所有订阅记录
                await entityManager.delete(UserSubscription, { userId });

                return {
                    orderId: cancelOrder.id,
                    orderNo,
                    message: "已取消用户会员",
                };
            }

            // 查询等级信息
            const level = await this.membershipLevelsRepository.findOne({
                where: { id: levelId, status: true },
            });
            if (!level) {
                throw HttpErrorFactory.badRequest("会员等级不存在或已下架");
            }

            // 计算时长文本和结束时间
            let durationText = "";
            let endTime = new Date(now);

            switch (durationType) {
                case "1":
                    durationText = "1个月";
                    endTime.setMonth(endTime.getMonth() + 1);
                    break;
                case "3":
                    durationText = "3个月";
                    endTime.setMonth(endTime.getMonth() + 3);
                    break;
                case "12":
                    durationText = "1年";
                    endTime.setFullYear(endTime.getFullYear() + 1);
                    break;
                case "forever":
                    durationText = "永久";
                    endTime.setFullYear(endTime.getFullYear() + 100);
                    break;
                case "custom":
                    if (!customValue || !customUnit) {
                        throw HttpErrorFactory.badRequest("自定义时长参数不完整");
                    }
                    switch (customUnit) {
                        case "day":
                            durationText = `${customValue}天`;
                            endTime.setDate(endTime.getDate() + customValue);
                            break;
                        case "month":
                            durationText = `${customValue}个月`;
                            endTime.setMonth(endTime.getMonth() + customValue);
                            break;
                        case "year":
                            durationText = `${customValue}年`;
                            endTime.setFullYear(endTime.getFullYear() + customValue);
                            break;
                    }
                    break;
            }

            // 创建订单快照
            const levelSnap = JSON.parse(
                JSON.stringify({
                    id: level.id,
                    name: level.name,
                    level: level.level,
                    givePower: level.givePower,
                    status: level.status,
                    icon: level.icon,
                    description: level.description,
                    benefits: level.benefits,
                }),
            );

            // 生成订单号
            const orderNo = await generateNo(this.membershipOrderRepository, "orderNo");

            // 创建系统调整订单（标记为已支付，金额为0，source = 0）
            const order = await entityManager.save(MembershipOrder, {
                userId,
                orderNo,
                levelId: level.id,
                planId: "", // 系统调整没有套餐
                planSnap: {},
                levelSnap,
                payType: PayConfigPayType.WECHAT, // 占位，系统调整不需要支付
                duration: durationText,
                totalAmount: 0,
                orderAmount: 0,
                payState: 1, // 已支付（系统调整直接生效）
                status: 1, // 订单完成
                payTime: now,
                refundStatus: 0,
                source: 0, // 系统调整
            });

            // 查询用户的所有系统订阅记录（source = 0），确保每个用户只有一条系统订阅记录
            const existingSubscriptions = await entityManager.find(UserSubscription, {
                where: {
                    userId,
                    source: SUBSCRIPTION_SOURCE.SYSTEM,
                },
            });

            // 更新或创建订阅记录
            if (existingSubscriptions.length > 0) {
                // 如果存在多条系统订阅记录，删除多余的，只保留一条
                if (existingSubscriptions.length > 1) {
                    // 保留第一条，删除其他的
                    const subscriptionsToDelete = existingSubscriptions.slice(1);
                    await entityManager.remove(UserSubscription, subscriptionsToDelete);
                }

                // 更新保留的订阅记录
                const subscriptionToUpdate = existingSubscriptions[0];
                subscriptionToUpdate.levelId = levelId;
                subscriptionToUpdate.startTime = now;
                subscriptionToUpdate.endTime = endTime;
                subscriptionToUpdate.orderId = order.id;
                await entityManager.save(UserSubscription, subscriptionToUpdate);
            } else {
                // 创建新的订阅记录
                await entityManager.save(UserSubscription, {
                    userId,
                    levelId,
                    orderId: order.id,
                    startTime: now,
                    endTime,
                    source: SUBSCRIPTION_SOURCE.SYSTEM,
                });
            }

            return {
                orderId: order.id,
                orderNo,
                message: "系统调整订单创建成功",
            };
        });
    }

    /**
     * 计算订单的有效期（从开始时间加上订单时长）
     * @param startTime 开始时间（订单支付时间）
     * @param planSnap 订单快照中的套餐信息
     * @returns 订单有效期，如果无法计算则返回 null
     */
    private calculateOrderEndTime(startTime: Date, planSnap: any): Date | null {
        if (!startTime || !planSnap) {
            return null;
        }

        const durationConfig = planSnap?.durationConfig;
        const duration = planSnap?.duration;
        const endTime = new Date(startTime);

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

        return endTime;
    }
}
