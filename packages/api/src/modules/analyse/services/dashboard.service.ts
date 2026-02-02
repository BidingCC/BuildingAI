import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AiModel } from "@buildingai/db/entities";
import { AiProvider } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentChatMessage } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { AiChatMessage } from "@buildingai/db/entities";
import { AiChatRecord } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { Analyse, AnalyseActionType } from "@buildingai/db/entities";
import { Extension } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { MoreThanOrEqual, Repository } from "@buildingai/db/typeorm";
import {
    ChatStats,
    DashboardData,
    ExtensionData,
    OrderStats,
    RevenueDetail,
    TokenUsage,
    UserDetail,
    UserStats,
} from "@buildingai/types/analyse/dashboard.interface";
import { Injectable } from "@nestjs/common";

/**
 * 数据看板服务
 *
 * 提供后台工作台数据看板的统计功能
 */
@Injectable()
export class DashboardService extends BaseService<any> {
    /**
     * 构造函数
     *
     * @param userRepository 用户仓储
     * @param agentRepository 智能体仓储
     * @param agentChatRecordRepository 智能体对话记录仓储
     * @param agentChatMessageRepository 智能体对话消息仓储
     * @param aiChatRecordRepository AI对话记录仓储
     * @param aiChatMessageRepository AI对话消息仓储
     * @param rechargeOrderRepository 充值订单仓储
     * @param accountLogRepository 账户日志仓储
     * @param extensionRepository 插件仓储
     * @param aiModelRepository AI模型仓储
     * @param aiProviderRepository AI供应商仓储
     * @param analyseRepository 行为分析仓储
     */
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(AgentChatRecord)
        private readonly agentChatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(AgentChatMessage)
        private readonly agentChatMessageRepository: Repository<AgentChatMessage>,
        @InjectRepository(AiChatRecord)
        private readonly aiChatRecordRepository: Repository<AiChatRecord>,
        @InjectRepository(AiChatMessage)
        private readonly aiChatMessageRepository: Repository<AiChatMessage>,
        @InjectRepository(RechargeOrder)
        private readonly rechargeOrderRepository: Repository<RechargeOrder>,
        @InjectRepository(AccountLog)
        private readonly accountLogRepository: Repository<AccountLog>,
        @InjectRepository(Extension)
        private readonly extensionRepository: Repository<Extension>,
        @InjectRepository(AiModel)
        private readonly aiModelRepository: Repository<AiModel>,
        @InjectRepository(AiProvider)
        private readonly aiProviderRepository: Repository<AiProvider>,
        @InjectRepository(Analyse)
        private readonly analyseRepository: Repository<Analyse>,
    ) {
        super(userRepository);
    }

    /**
     * 获取数据看板统计信息
     *
     * @param options 时间范围选项
     * @param options.userDays 用户图表时间范围（天数）
     * @param options.revenueDays 收入图表时间范围（天数）
     * @param options.tokenDays Token使用排行时间范围（天数）
     * @returns 数据看板统计信息
     */
    async getDashboardData(options?: {
        userDays?: number;
        revenueDays?: number;
        tokenDays?: number;
    }): Promise<DashboardData> {
        const { userDays = 15, revenueDays = 15, tokenDays = 15 } = options || {};

        // 基础统计
        const [userStats, chatStats, orderStats] = await Promise.all([
            this.getUserStats(),
            this.getChatStats(),
            this.getOrderStats(),
        ]);

        // 详细数据
        const [userDetail, revenueDetail, tokenUsage, extension] = await Promise.all([
            this.getUserDetailData(userDays),
            this.getRevenueDetailData(revenueDays),
            this.getTokenUsageData(tokenDays),
            this.getExtensionData(),
        ]);

        return {
            user: userStats,
            chat: chatStats,
            order: orderStats,
            userDetail,
            revenueDetail,
            tokenUsage,
            extension,
        };
    }

    /**
     * 获取用户统计信息
     *
     * @returns 用户统计信息
     */
    private async getUserStats(): Promise<UserStats> {
        // 总用户数（排除根用户）
        const totalUsers = await this.userRepository.count({
            where: { isRoot: 0 },
        });

        // 活跃用户数（最近30天内有登录的用户）
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activeUsers = await this.userRepository.count({
            where: {
                isRoot: 0,
                lastLoginAt: MoreThanOrEqual(thirtyDaysAgo),
            },
        });

        // 今日新增用户
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersToday = await this.userRepository.count({
            where: {
                isRoot: 0,
                createdAt: MoreThanOrEqual(today),
            },
        });

        // 昨天新增用户（用于计算同比变化）
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(today);

        const newUsersYesterday = await this.userRepository
            .createQueryBuilder("user")
            .where("user.isRoot = :isRoot", { isRoot: 0 })
            .andWhere("user.createdAt >= :start AND user.createdAt < :end", {
                start: yesterday,
                end: yesterdayEnd,
            })
            .getCount();

        // 计算同比变化（百分比）
        const userChange =
            newUsersYesterday > 0
                ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100
                : newUsersToday > 0
                  ? 100
                  : 0;

        return {
            totalUsers,
            activeUsers,
            newUsersToday,
            userChange: Math.round(userChange * 100) / 100,
        };
    }

    /**
     * 获取对话统计信息
     *
     * @returns 对话统计信息
     */
    private async getChatStats(): Promise<ChatStats> {
        // 总对话数（智能体对话 + AI对话）
        const totalAgentConversations = await this.agentChatRecordRepository.count();
        const totalAiConversations = await this.aiChatRecordRepository.count();
        const totalConversations = totalAgentConversations + totalAiConversations;

        // 总Token数
        const agentTokensQuery = await this.agentChatRecordRepository
            .createQueryBuilder("record")
            .select("COALESCE(SUM(record.totalTokens), 0)", "total")
            .getRawOne();
        const agentTotalTokens = Number(agentTokensQuery?.total || 0);

        const aiTokensQuery = await this.aiChatRecordRepository
            .createQueryBuilder("record")
            .select("COALESCE(SUM(record.totalTokens), 0)", "total")
            .getRawOne();
        const aiTotalTokens = Number(aiTokensQuery?.total || 0);

        const totalTokens = agentTotalTokens + aiTotalTokens;

        // 今日对话数
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const agentConversationsToday =
            (await this.agentChatRecordRepository.count({
                where: {
                    createdAt: MoreThanOrEqual(today),
                },
            })) || 0;
        const aiConversationsToday =
            (await this.aiChatRecordRepository.count({
                where: {
                    createdAt: MoreThanOrEqual(today),
                },
            })) || 0;
        const conversationsToday = Number(agentConversationsToday) + Number(aiConversationsToday);

        // 昨天对话数（用于计算同比变化）
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(today);

        const agentConversationsYesterday =
            (await this.agentChatRecordRepository
                .createQueryBuilder("record")
                .where("record.createdAt >= :start AND record.createdAt < :end", {
                    start: yesterday,
                    end: yesterdayEnd,
                })
                .getCount()) || 0;
        const aiConversationsYesterday =
            (await this.aiChatRecordRepository
                .createQueryBuilder("record")
                .where("record.createdAt >= :start AND record.createdAt < :end", {
                    start: yesterday,
                    end: yesterdayEnd,
                })
                .getCount()) || 0;
        const conversationsYesterday =
            Number(agentConversationsYesterday) + Number(aiConversationsYesterday);

        // 计算同比变化（百分比）
        let chatChange = 0;
        if (conversationsYesterday > 0) {
            chatChange =
                ((conversationsToday - conversationsYesterday) / conversationsYesterday) * 100;
        } else if (conversationsToday > 0) {
            chatChange = 100;
        } else {
            chatChange = 0;
        }

        // 确保结果不是 NaN 或 Infinity
        if (!Number.isFinite(chatChange)) {
            chatChange = 0;
        }

        return {
            totalConversations,
            totalTokens,
            conversationsToday,
            chatChange: Math.round(chatChange * 100) / 100,
        };
    }

    /**
     * 获取订单统计信息
     *
     * @returns 订单统计信息
     */
    private async getOrderStats(): Promise<OrderStats> {
        // 总订单数
        const totalOrders = await this.rechargeOrderRepository.count();

        // 总订单金额
        const totalAmountQuery = await this.rechargeOrderRepository
            .createQueryBuilder("order")
            .select("COALESCE(SUM(order.orderAmount), 0)", "total")
            .getRawOne();
        const totalAmount = Number(totalAmountQuery?.total || 0);

        // 今日订单数
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersToday = await this.rechargeOrderRepository.count({
            where: {
                createdAt: MoreThanOrEqual(today),
            },
        });

        // 昨天订单数（用于计算同比变化）
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(today);

        const ordersYesterday = await this.rechargeOrderRepository
            .createQueryBuilder("order")
            .where("order.createdAt >= :start AND order.createdAt < :end", {
                start: yesterday,
                end: yesterdayEnd,
            })
            .getCount();

        // 计算同比变化（百分比）
        const orderChange =
            ordersYesterday > 0
                ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100
                : ordersToday > 0
                  ? 100
                  : 0;

        return {
            totalOrders,
            totalAmount,
            ordersToday,
            orderChange: Math.round(orderChange * 100) / 100,
        };
    }

    /**
     * 获取用户详细数据
     *
     * @param days 时间范围（天数）
     * @returns 用户详细数据（今日访问、注册、近N天数据、同比、图表）
     */
    private async getUserDetailData(days: number = 15): Promise<UserDetail> {
        // 使用 UTC 时间，避免时区问题
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // 今日注册
        const todayRegister = await this.userRepository.count({
            where: {
                isRoot: 0,
                createdAt: MoreThanOrEqual(today),
            },
        });

        // 今日访问（基于 analyse 表，已在记录时30分钟内去重）
        const todayVisit = await this.analyseRepository.count({
            where: {
                actionType: AnalyseActionType.PAGE_VISIT,
                createdAt: MoreThanOrEqual(today),
            },
        });

        // 近N天数据（使用 UTC 时间）
        const lastDaysStart = new Date();
        lastDaysStart.setUTCDate(lastDaysStart.getUTCDate() - days);
        lastDaysStart.setUTCHours(0, 0, 0, 0);

        // 近N天注册总数
        const lastDaysRegister = await this.userRepository.count({
            where: {
                isRoot: 0,
                createdAt: MoreThanOrEqual(lastDaysStart),
            },
        });

        // 近N天访问总数（基于 analyse 表）
        const lastDaysVisit = await this.analyseRepository.count({
            where: {
                actionType: AnalyseActionType.PAGE_VISIT,
                createdAt: MoreThanOrEqual(lastDaysStart),
            },
        });

        // 同比过去N天（往前推N天，使用 UTC 时间）
        const compareStart = new Date(lastDaysStart);
        compareStart.setUTCDate(compareStart.getUTCDate() - days);
        const compareEnd = new Date(lastDaysStart);

        // 同比过去N天注册（统计从 compareStart 到 lastDaysStart 之间的注册）
        const compareRegister = await this.userRepository
            .createQueryBuilder("user")
            .where("user.isRoot = :isRoot", { isRoot: 0 })
            .andWhere("user.createdAt >= :start AND user.createdAt < :end", {
                start: compareStart,
                end: compareEnd,
            })
            .getCount();

        // 同比过去N天访问（基于 analyse 表，统计从 compareStart 到 lastDaysStart 之间的访问）
        const compareVisit = await this.analyseRepository
            .createQueryBuilder("analyse")
            .where("analyse.actionType = :actionType", {
                actionType: AnalyseActionType.PAGE_VISIT,
            })
            .andWhere("analyse.createdAt >= :start AND analyse.createdAt < :end", {
                start: compareStart,
                end: compareEnd,
            })
            .getCount();

        // 计算同比变化
        const visitChange =
            lastDaysVisit > 0 ? ((lastDaysVisit - compareVisit) / compareVisit) * 100 : 0;
        const registerChange =
            lastDaysRegister > 0
                ? ((lastDaysRegister - compareRegister) / compareRegister) * 100
                : 0;

        // 近N天图表数据（按天统计）
        // 注册数据（使用UTC时区提取日期，确保与图表数据生成逻辑一致）
        // 使用TO_CHAR直接返回字符串格式的日期，避免Date对象转换时的时区问题
        const registerChartQuery = await this.userRepository
            .createQueryBuilder("user")
            .where("user.isRoot = :isRoot", { isRoot: 0 })
            .andWhere("user.createdAt >= :start", { start: lastDaysStart })
            .select(`TO_CHAR(user.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, "date")
            .addSelect("COUNT(DISTINCT user.id)", "register")
            .groupBy(`TO_CHAR(user.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
            .orderBy("date", "ASC")
            .getRawMany();
        // 访问数据（基于 analyse 表，使用UTC时区提取日期）
        const visitChartQuery = await this.analyseRepository
            .createQueryBuilder("analyse")
            .where("analyse.actionType = :actionType", {
                actionType: AnalyseActionType.PAGE_VISIT,
            })
            .andWhere("analyse.createdAt >= :start", { start: lastDaysStart })
            .select(`TO_CHAR(analyse.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, "date")
            .addSelect("COUNT(analyse.id)", "visit")
            .groupBy(`TO_CHAR(analyse.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
            .orderBy("date", "ASC")
            .getRawMany();

        // 生成完整的N天图表数据
        const chartData: UserDetail["chartData"] = [];
        const visitMap = new Map<string, number>();
        const registerMap = new Map<string, number>();

        // 将查询结果转换为 Map，便于查找
        // 使用TO_CHAR后，PostgreSQL直接返回字符串格式的日期（YYYY-MM-DD），直接使用
        visitChartQuery.forEach((item: any) => {
            const dateStr = String(item.date || "").trim();
            visitMap.set(dateStr, Number(item.visit || 0));
        });

        registerChartQuery.forEach((item: any) => {
            const dateStr = String(item.date || "").trim();
            registerMap.set(dateStr, Number(item.register || 0));
        });

        // 生成N天的图表数据
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setUTCDate(date.getUTCDate() - i);
            date.setUTCHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split("T")[0];

            chartData.push({
                date: dateStr,
                visit: visitMap.get(dateStr) || 0,
                register: registerMap.get(dateStr) || 0,
            });
        }

        return {
            todayVisit,
            todayRegister,
            last15Days: {
                totalVisit: lastDaysVisit,
                totalRegister: lastDaysRegister,
            },
            compareLast15Days: {
                visitChange: Math.round(visitChange * 100) / 100,
                registerChange: Math.round(registerChange * 100) / 100,
            },
            chartData,
        };
    }

    /**
     * 获取收入详细数据
     *
     * @param days 时间范围（天数）
     * @returns 收入详细数据（今日收入、订单、近N天数据、图表）
     */
    private async getRevenueDetailData(days: number = 15): Promise<RevenueDetail> {
        // 使用 UTC 时间，避免时区问题
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // 今日收入（已支付订单）
        const todayRevenueQuery = await this.rechargeOrderRepository
            .createQueryBuilder("order")
            .where("order.createdAt >= :today", { today })
            .andWhere("order.payStatus = :payStatus", { payStatus: 1 })
            .select("COALESCE(SUM(order.orderAmount), 0)", "total")
            .getRawOne();
        const todayRevenue = Number(todayRevenueQuery?.total || 0);

        // 今日订单数（已支付）
        const todayOrders = await this.rechargeOrderRepository.count({
            where: {
                payStatus: 1,
                createdAt: MoreThanOrEqual(today),
            },
        });

        // 近N天数据（使用 UTC 时间）
        const lastDaysStart = new Date();
        lastDaysStart.setUTCDate(lastDaysStart.getUTCDate() - days);
        lastDaysStart.setUTCHours(0, 0, 0, 0);

        // 近N天总收入
        const lastDaysRevenueQuery = await this.rechargeOrderRepository
            .createQueryBuilder("order")
            .where("order.createdAt >= :start", { start: lastDaysStart })
            .andWhere("order.payStatus = :payStatus", { payStatus: 1 })
            .select("COALESCE(SUM(order.orderAmount), 0)", "total")
            .getRawOne();
        const lastDaysRevenue = Number(lastDaysRevenueQuery?.total || 0);

        // 近N天总订单数
        const lastDaysOrders = await this.rechargeOrderRepository.count({
            where: {
                payStatus: 1,
                createdAt: MoreThanOrEqual(lastDaysStart),
            },
        });

        // 同比过去N天（往前推N天，使用 UTC 时间）
        const compareStart = new Date(lastDaysStart);
        compareStart.setUTCDate(compareStart.getUTCDate() - days);
        const compareEnd = new Date(lastDaysStart);

        // 同比过去15天收入
        const compareRevenueQuery = await this.rechargeOrderRepository
            .createQueryBuilder("order")
            .where("order.createdAt >= :start AND order.createdAt < :end", {
                start: compareStart,
                end: compareEnd,
            })
            .andWhere("order.payStatus = :payStatus", { payStatus: 1 })
            .select("COALESCE(SUM(order.orderAmount), 0)", "total")
            .getRawOne();
        const compareRevenue = Number(compareRevenueQuery?.total || 0);

        // 同比过去15天订单数
        const compareOrders = await this.rechargeOrderRepository.count({
            where: {
                payStatus: 1,
                createdAt: MoreThanOrEqual(compareStart),
            },
        });

        // 计算同比变化
        const revenueChange =
            compareRevenue > 0 ? ((lastDaysRevenue - compareRevenue) / compareRevenue) * 100 : 0;
        const ordersChange =
            compareOrders > 0 ? ((lastDaysOrders - compareOrders) / compareOrders) * 100 : 0;

        // 近N天图表数据（按天统计，使用UTC时区提取日期）
        // 使用TO_CHAR直接返回字符串格式的日期，避免Date对象转换时的时区问题
        const chartDataQuery = await this.rechargeOrderRepository
            .createQueryBuilder("order")
            .where("order.createdAt >= :start", { start: lastDaysStart })
            .andWhere("order.payStatus = :payStatus", { payStatus: 1 })
            .select(`TO_CHAR(order.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, "date")
            .addSelect("COALESCE(SUM(order.orderAmount), 0)", "revenue")
            .addSelect("COUNT(order.id)", "orders")
            .groupBy(`TO_CHAR(order.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
            .orderBy("date", "ASC")
            .getRawMany();

        // 生成完整的N天图表数据（使用UTC时间）
        const chartData: RevenueDetail["chartData"] = [];
        const revenueMap = new Map<string, { revenue: number; orders: number }>();

        // 将查询结果转换为 Map，便于查找
        chartDataQuery.forEach((item: any) => {
            const dateStr = String(item.date || "").trim();
            revenueMap.set(dateStr, {
                revenue: Number(item.revenue || 0),
                orders: Number(item.orders || 0),
            });
        });

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setUTCDate(date.getUTCDate() - i);
            date.setUTCHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split("T")[0];

            const dayData = revenueMap.get(dateStr);
            chartData.push({
                date: dateStr,
                revenue: dayData?.revenue || 0,
                orders: dayData?.orders || 0,
            });
        }

        return {
            todayRevenue,
            todayOrders,
            last15Days: {
                totalRevenue: lastDaysRevenue,
                totalOrders: lastDaysOrders,
            },
            compareLast15Days: {
                revenueChange: Math.round(revenueChange * 100) / 100,
                ordersChange: Math.round(ordersChange * 100) / 100,
            },
            chartData,
        };
    }

    /**
     * 获取Token使用数据
     *
     * @param days 时间范围（天数）
     * @returns Token使用数据（按模型、供应商统计）
     */
    private async getTokenUsageData(days: number = 15): Promise<TokenUsage> {
        // 时间范围起始日期
        const daysStart = new Date();
        daysStart.setDate(daysStart.getDate() - days);
        daysStart.setHours(0, 0, 0, 0);

        // 按模型统计（AI对话）
        const modelStatsQuery = await this.aiChatMessageRepository
            .createQueryBuilder("message")
            .innerJoin("message.model", "model")
            .innerJoin("model.provider", "provider")
            .where("message.createdAt >= :start", { start: daysStart })
            .select("model.id", "modelId")
            .addSelect("model.name", "modelName")
            .addSelect("provider.name", "providerName")
            .addSelect("provider.iconUrl", "iconUrl")
            .addSelect("COUNT(DISTINCT message.conversationId)", "conversations")
            .addSelect("COALESCE(SUM((message.tokens->>'total_tokens')::int), 0)", "tokens")
            .groupBy("model.id")
            .addGroupBy("model.name")
            .addGroupBy("provider.name")
            .addGroupBy("provider.iconUrl")
            .orderBy("tokens", "DESC")
            .limit(20)
            .getRawMany();

        const byModel = modelStatsQuery.map((item) => ({
            modelId: item.modelId,
            modelName: item.modelName || "未知模型",
            providerName: item.providerName || "未知供应商",
            iconUrl: item.iconUrl || undefined,
            conversations: Number(item.conversations || 0),
            tokens: Number(item.tokens || 0),
        }));

        // 按供应商统计
        const providerStatsQuery = await this.aiChatMessageRepository
            .createQueryBuilder("message")
            .innerJoin("message.model", "model")
            .innerJoin("model.provider", "provider")
            .where("message.createdAt >= :start", { start: daysStart })
            .select("provider.id", "providerId")
            .addSelect("provider.provider", "provider")
            .addSelect("provider.name", "providerName")
            .addSelect("provider.iconUrl", "iconUrl")
            .addSelect("COUNT(DISTINCT message.conversationId)", "conversations")
            .addSelect("COALESCE(SUM((message.tokens->>'total_tokens')::int), 0)", "tokens")
            .groupBy("provider.id")
            .addGroupBy("provider.provider")
            .addGroupBy("provider.name")
            .addGroupBy("provider.iconUrl")
            .orderBy("tokens", "DESC")
            .getRawMany();

        const byProvider = providerStatsQuery.map((item) => ({
            providerId: item.providerId,
            provider: item.provider || "",
            providerName: item.providerName || "未知供应商",
            iconUrl: item.iconUrl || undefined,
            conversations: Number(item.conversations || 0),
            tokens: Number(item.tokens || 0),
        }));

        return {
            byModel,
            byProvider,
        };
    }

    /**
     * 获取插件数据
     *
     * @returns 插件数据（使用排行、数量）
     */
    private async getExtensionData(): Promise<ExtensionData> {
        // 插件总数
        const totalCount = await this.extensionRepository.count();

        // 已启用插件数
        const enabledCount = await this.extensionRepository.count({
            where: { status: 1 },
        });

        // 插件使用排行（通过 analyse 表统计）
        // 先查询所有插件使用记录，从 extraData 中提取插件 identifier
        const analyseRecords = await this.analyseRepository.find({
            where: {
                actionType: AnalyseActionType.PLUGIN_USE,
            },
            select: ["id", "source", "extraData"],
        });

        // 统计每个插件的使用次数（从 extraData.plugin 或 source 中提取）
        const pluginUsageMap = new Map<string, number>();
        for (const record of analyseRecords) {
            const pluginIdentifier =
                record.extraData?.plugin || record.extraData?.extensionName || record.source;
            if (pluginIdentifier) {
                const count = pluginUsageMap.get(pluginIdentifier) || 0;
                pluginUsageMap.set(pluginIdentifier, count + 1);
            }
        }

        // 查询所有插件，匹配 identifier 或 name
        const allExtensions = await this.extensionRepository.find({
            select: ["id", "name", "identifier"],
        });

        // 构建使用排行数据
        const usageRanking: ExtensionData["usageRanking"] = [];
        for (const [pluginIdentifier, usageCount] of pluginUsageMap.entries()) {
            const extension = allExtensions.find(
                (ext) => ext.identifier === pluginIdentifier || ext.name === pluginIdentifier,
            );
            if (extension) {
                usageRanking.push({
                    extensionId: extension.id,
                    extensionName: extension.name,
                    usageCount,
                });
            }
        }

        // 按使用次数排序，取前10
        usageRanking.sort((a, b) => b.usageCount - a.usageCount);
        usageRanking.splice(10);

        return {
            totalCount,
            enabledCount,
            usageRanking,
        };
    }
}
