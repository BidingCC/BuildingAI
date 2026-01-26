import { BaseService } from "@buildingai/base";
import { PayConfigPayType, PayConfigType } from "@buildingai/constants";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { type UserTerminalType } from "@buildingai/constants/shared/status-codes.constant";
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
import { Injectable } from "@nestjs/common";
import { In, Repository } from "typeorm";

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
    ) {
        super(membershipOrderRepository);
    }

    /**
     * 会员订单列表
     * @param queryMembershipOrderDto 查询参数
     * @returns 订单列表及统计信息
     */
    async lists(queryMembershipOrderDto: QueryMembershipOrderDto) {
        const { orderNo, userKeyword, startTime, endTime, payType, payState, refundState } =
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
        if (payState) {
            queryBuilder.andWhere("membership-order.payState = :payState", {
                payState,
            });
        }
        if (refundState) {
            queryBuilder.andWhere("membership-order.refundStatus = :refundState", {
                refundState,
            });
        }

        queryBuilder.select([
            "membership-order.id",
            "membership-order.orderNo",
            "membership-order.planId",
            "membership-order.levelId",
            "membership-order.payType",
            "membership-order.payState",
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
            const payStateDesc = order.payState == 1 ? "已支付" : "未支付";
            const refundStateDesc = order.refundStatus == 1 ? "已退款" : "未退款";
            const plan = planMap.get(order.planId) || null;
            const level = levelMap.get(order.levelId) || null;

            // 移除 planId 和 levelId，替换为 plan 和 level 对象
            const { planId: _planId, levelId: _levelId, ...rest } = order;
            return { ...rest, plan, level, payTypeDesc, payStateDesc, refundStateDesc };
        });

        // 统计只统计订单来源为订单购买（source = 1）的订单
        const totalOrder = await this.membershipOrderRepository.count({
            where: { payState: 1, source: 1 },
        });
        const totalAmount =
            (await this.membershipOrderRepository.sum("orderAmount", {
                payState: 1,
                source: 1,
            })) || 0;
        const totalRefundOrder = await this.membershipOrderRepository.count({
            where: { refundStatus: 1, source: 1 },
        });
        const totalRefundAmount =
            (await this.membershipOrderRepository.sum("orderAmount", {
                refundStatus: 1,
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
            "membership-order.orderNo",
            "membership-order.payType",
            "membership-order.payState",
            "membership-order.refundStatus",
            "membership-order.planSnap",
            "membership-order.levelSnap",
            "membership-order.totalAmount",
            "membership-order.duration",
            "membership-order.payTime",
            "membership-order.createdAt",
            "membership-order.orderAmount",
            "user.nickname",
            "user.avatar",
        ]);
        const detail = await queryBuilder.getOne();
        if (!detail) {
            throw HttpErrorFactory.badRequest("会员订单不存在");
        }
        let refundStatusDesc = "-";
        if (detail.refundStatus) {
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
        if (detail.refundStatus) {
            refundNo = (
                await this.refundLogRepository.findOne({
                    where: { orderId: detail.id },
                })
            )?.refundNo;
        }
        const terminalDesc = "电脑PC";
        return {
            ...detail,
            orderType,
            refundStatusDesc,
            terminalDesc,
            refundNo,
            payTypeDesc: payTypeDesc.name,
        };
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
            if (order.refundStatus) {
                throw new Error("订单已退款");
            }

            // 从订单快照中获取赠送的积分数量
            const levelSnap = order.levelSnap as any;
            const givePower = levelSnap?.givePower || 0;

            await this.membershipOrderRepository.manager.transaction(async (entityManager) => {
                // 发起退款
                await this.refundService.initiateRefund({
                    entityManager,
                    orderId: order.id,
                    userId: order.userId,
                    orderNo: order.orderNo,
                    from: REFUND_ORDER_FROM.FROM_MEMBERSHIP,
                    payType: order.payType,
                    transactionId: order.transactionId,
                    orderAmount: order.orderAmount,
                    refundAmount: order.orderAmount,
                });

                // 更新退款状态
                await entityManager.update(MembershipOrder, id, {
                    refundStatus: 1,
                });

                // 删除用户订阅记录
                await entityManager.delete(UserSubscription, {
                    orderId: order.id,
                });

                // 扣除购买会员时赠送的积分
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

            // 验证支付方式
            // if (PayConfigPayType.WECHAT !== payType) {
            //     throw HttpErrorFactory.badRequest("支付方式错误");
            // }

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
    async userOrderLists(userId: string, paginationDto: { page?: number; pageSize?: number }) {
        const queryBuilder = this.membershipOrderRepository.createQueryBuilder("membership-order");
        queryBuilder.where("membership-order.userId = :userId", { userId });
        queryBuilder.andWhere("membership-order.payState = :payState", { payState: 1 });
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
                payTypeDesc,
                refundStatus: order.refundStatus,
                createdAt: order.createdAt,
            };
        });

        return {
            ...orderLists,
            items,
        };
    }

    /**
     * 获取用户订阅列表
     * @description 获取当前用户的所有订阅记录（包含会员等级、有效期等信息）
     * @param userId 用户ID
     * @param paginationDto 分页参数
     * @returns 用户订阅列表
     */
    async userSubscriptionLists(
        userId: string,
        paginationDto: { page?: number; pageSize?: number },
    ) {
        const page = paginationDto.page || 1;
        const pageSize = paginationDto.pageSize || 10;

        const queryBuilder = this.userSubscriptionRepository.createQueryBuilder("subscription");
        queryBuilder.where("subscription.userId = :userId", { userId });
        queryBuilder.leftJoinAndSelect("subscription.level", "level");
        queryBuilder.select([
            "subscription.id",
            "subscription.startTime",
            "subscription.endTime",
            "subscription.source",
            "subscription.orderId",
            "subscription.createdAt",
            "level.id",
            "level.name",
            "level.icon",
            "level.level",
        ]);
        // 添加计算字段用于排序：未过期的在前面
        queryBuilder.addSelect(
            `CASE WHEN subscription.end_time > NOW() THEN 0 ELSE 1 END`,
            "is_expired_sort",
        );
        // 排序：未过期的在前面，同状态下按创建时间倒序
        queryBuilder.orderBy("is_expired_sort", "ASC");
        queryBuilder.addOrderBy("subscription.createdAt", "DESC");
        queryBuilder.skip((page - 1) * pageSize);
        queryBuilder.take(pageSize);

        const [subscriptions, total] = await queryBuilder.getManyAndCount();

        // 收集所有订单ID用于批量查询
        const orderIds = subscriptions
            .filter((item) => item.orderId)
            .map((item) => item.orderId) as string[];

        // 批量查询订单信息获取订阅时长和退款状态
        const orderMap = new Map<string, { duration: string; refundStatus: number }>();
        if (orderIds.length > 0) {
            const orders = await this.membershipOrderRepository.find({
                where: { id: In(orderIds) },
                select: ["id", "duration", "refundStatus"],
            });
            orders.forEach((order) => {
                orderMap.set(order.id, {
                    duration: order.duration,
                    refundStatus: order.refundStatus,
                });
            });
        }

        const now = new Date();

        // 找出所有未过期的订阅
        const validSubscriptions = subscriptions.filter((sub) => sub.endTime > now);

        // 确定生效中的订阅ID
        let activeSubscriptionId: string | null = null;

        if (validSubscriptions.length > 0) {
            // 找出最高等级
            const maxLevel = Math.max(...validSubscriptions.map((sub) => sub.level?.level ?? 0));

            // 筛选出最高等级的未过期订阅
            const highestLevelSubscriptions = validSubscriptions.filter(
                (sub) => (sub.level?.level ?? 0) === maxLevel,
            );

            // 在最高等级中，取最早订阅的那条（按 startTime 升序）
            const activeSubscription = highestLevelSubscriptions.sort(
                (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
            )[0];

            activeSubscriptionId = activeSubscription?.id ?? null;
        }

        const items = subscriptions
            .map((subscription) => {
                const isExpired = subscription.endTime < now;
                const isActive = subscription.id === activeSubscriptionId;
                // 如果 level 为 null，显示为"系统调整"，否则根据 source 显示
                let sourceDesc: string;
                if (!subscription.level) {
                    sourceDesc = "系统调整";
                } else {
                    sourceDesc = SUBSCRIPTION_SOURCE_DESC[subscription.source] || "未知来源";
                }
                const orderInfo = subscription.orderId ? orderMap.get(subscription.orderId) : null;
                const duration = orderInfo?.duration || null;
                const refundStatus = orderInfo?.refundStatus ?? 0;

                return {
                    id: subscription.id,
                    level: subscription.level,
                    startTime: subscription.startTime,
                    endTime: subscription.endTime,
                    source: subscription.source,
                    sourceDesc,
                    duration,
                    refundStatus,
                    isExpired,
                    isActive,
                    createdAt: subscription.createdAt,
                };
            })
            // 排序：生效中 > 未过期 > 已过期，同状态下按创建时间倒序
            .sort((a, b) => {
                // 生效中的最先
                if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                // 未过期的在已过期前面
                if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
                // 同状态按创建时间倒序
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

        return {
            items,
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
