import { BaseService } from "@buildingai/base";
import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE_DESCRIPTION,
} from "@buildingai/constants/shared/account-log.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AiChatMessage } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { QueryAccountLogDto } from "@modules/finance/dto/query-account-log.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class FinanceService extends BaseService<AccountLog> {
    constructor(
        @InjectRepository(AccountLog)
        private readonly accountLogRepository: Repository<AccountLog>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RechargeOrder)
        private readonly rechargeOrderRepository: Repository<RechargeOrder>,
        @InjectRepository(AiChatMessage)
        private readonly aiChatRMessageRepository: Repository<AiChatMessage>,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
    ) {
        super(accountLogRepository);
    }

    async center() {
        //经营概括
        //累计收入金额
        const totalIncomeAmount = await this.rechargeOrderRepository.sum("orderAmount", {
            payStatus: 1,
        });
        //累计订单数量
        const totalIncomeNum = await this.rechargeOrderRepository.count({
            where: { payStatus: 1 },
        });
        //累计退款金额
        const totalRefundAmount = await this.rechargeOrderRepository.sum("orderAmount", {
            refundStatus: 1,
        });
        //累计退款数量
        const totalRefundNum = await this.rechargeOrderRepository.count({
            where: { refundStatus: 1 },
        });
        //净收入
        const totalNetIncome = totalIncomeAmount - totalRefundAmount;
        //充值概括
        //充值金额
        const rechargeAmount = totalIncomeAmount;
        //充值订单数量
        const rechargeNum = totalIncomeNum;
        //充值退款
        const rechargeRefundAmount = totalRefundAmount;
        //充值退款数量
        const rechargeRefundNum = totalRefundNum;
        //充值净收入
        const rechargeNetIncome = totalNetIncome;
        //用户概况
        //用户总人数
        const totalUserNum = await this.userRepository.count({
            select: ["id"],
            where: { isRoot: 0 },
        });
        //累计充值人数
        const totalRecharge = await this.rechargeOrderRepository
            .createQueryBuilder("recharge-order")
            .where("recharge-order.payStatus = :payStatus", { payStatus: 1 })
            .select("COUNT(recharge-order.id)", "count")
            .getRawOne();
        const totalRechargeNum = Number(totalRecharge.count || 0);
        //累计充值金额
        const userAccount = await this.userRepository
            .createQueryBuilder("user")
            .select("SUM(user.totalRechargeAmount)", "totalRechargeSum")
            .addSelect("SUM(user.power)", "totalPowerSum")
            // .where("user.source = :source", { source: UserCreateSource.CONSOLE })
            .getRawOne();
        const totalRechargeAmount = Number(userAccount.totalRechargeSum || 0);
        const totalPowerSum = Number(userAccount.totalPowerSum || 0);
        //累计对话次数
        const totalChatNum = await this.aiChatRMessageRepository.count({
            where: {
                status: "completed",
            },
        });
        return {
            finance: {
                totalIncomeAmount,
                totalIncomeNum,
                totalRefundAmount,
                totalRefundNum,
                totalNetIncome,
            },
            recharge: {
                rechargeAmount,
                rechargeNum,
                rechargeRefundAmount,
                rechargeRefundNum,
                rechargeNetIncome,
            },
            user: {
                totalUserNum,
                totalRechargeNum,
                totalChatNum,
                totalRechargeAmount,
                totalPowerSum,
            },
        };
    }
    /**
     * 用户账户变动记录
     * @param queryAccountLogDto 查询参数，包含关键词和账户类型筛选
     * @returns 分页的账户变动记录列表，包含用户信息和类型描述
     */
    async accountLogLists(queryAccountLogDto: QueryAccountLogDto) {
        // 构建查询并获取分页数据
        const queryBuilder = this.buildAccountLogQuery(queryAccountLogDto);
        const paginationResult = await this.paginateQueryBuilder(queryBuilder, queryAccountLogDto);

        // 获取关联用户信息并处理数据映射
        const enrichedItems = await this.enrichAccountLogItems(paginationResult.items);

        return {
            ...paginationResult,
            items: enrichedItems,
            accountTypeLists: ACCOUNT_LOG_TYPE_DESCRIPTION,
        };
    }

    /**
     * 构建账户变动记录查询
     * @param queryAccountLogDto 查询参数
     * @returns 构建好的查询构建器
     */
    private buildAccountLogQuery(queryAccountLogDto: QueryAccountLogDto) {
        const { keyword, accountType } = queryAccountLogDto;

        const queryBuilder = this.accountLogRepository
            .createQueryBuilder("account-log")
            .leftJoin("account-log.user", "user");

        // 添加关键词搜索条件
        if (keyword) {
            queryBuilder.andWhere("(user.username ILIKE :keyword OR user.phone ILIKE :keyword)", {
                keyword: `%${keyword}%`,
            });
        }

        // 添加账户类型筛选条件
        if (accountType) {
            queryBuilder.andWhere("account-log.accountType = :accountType", {
                accountType,
            });
        }

        // 选择需要的字段
        queryBuilder.select([
            "account-log.id",
            "account-log.accountNo",
            "account-log.accountType",
            "account-log.action",
            "account-log.changeAmount",
            "account-log.associationUserId",
            "account-log.leftAmount",
            "account-log.createdAt",
            "account-log.sourceInfo",
            "user.username",
            "user.userNo",
            "user.avatar",
            "user.nickname",
        ]);

        // 设置排序规则
        queryBuilder
            .orderBy("account-log.createdAt", "DESC")
            .addOrderBy("account-log.accountType", "DESC");

        return queryBuilder;
    }

    /**
     * 丰富账户变动记录数据，添加类型描述和关联用户信息
     * @param accountLogs 原始账户变动记录列表
     * @returns 处理后的账户变动记录列表
     */
    private async enrichAccountLogItems(accountLogs: any[]) {
        // 收集所有关联用户ID
        const associationUserIds = new Set<string>();
        const userIds = new Set<string>();

        accountLogs.forEach((accountLog) => {
            if (accountLog.associationUserId) {
                associationUserIds.add(String(accountLog.associationUserId));
            }
            if (accountLog.userId) {
                userIds.add(String(accountLog.userId));
            }
        });

        // 查询所有相关用户
        const allUserIds = [...new Set([...associationUserIds, ...userIds])];
        const users = await this.userRepository.find({
            where: { id: In(allUserIds) },
            select: ["id", "nickname", "username"],
        });

        // 创建用户ID到昵称的映射，提高查找效率
        const userNicknameMap = new Map(
            users.map((user) => [user.id, user.nickname || user.username || "未知用户"]),
        );

        // 收集所有需要查询的智能体ID
        const agentIds = new Set<string>();
        accountLogs.forEach((accountLog) => {
            if (
                accountLog.sourceInfo?.type === ACCOUNT_LOG_SOURCE.AGENT_CHAT &&
                accountLog.sourceInfo?.source
            ) {
                agentIds.add(String(accountLog.sourceInfo.source));
            }
        });

        // 如果有智能体ID，先批量查询
        const agentMap = new Map<string, string>();
        if (agentIds.size > 0) {
            const agentIdArray = Array.from(agentIds);
            try {
                // 批量查询智能体信息
                const agents = await this.agentRepository.find({
                    where: { id: In(agentIdArray) },
                    select: ["id", "name"],
                });

                // 构建ID到名称的映射
                agents.forEach((agent) => {
                    agentMap.set(agent.id, agent.name);
                });
            } catch (error) {
                this.logger.error(`查询智能体信息失败: ${error.message}`);
            }
        }

        // 处理每条记录，添加描述信息
        return accountLogs.map((accountLog) => {
            const accountTypeDesc = ACCOUNT_LOG_TYPE_DESCRIPTION[accountLog.accountType];
            const associationUser = userNicknameMap.get(String(accountLog.associationUserId)) || "";
            let consumeSourceDesc = "";

            // 根据来源类型处理
            if (accountLog.sourceInfo) {
                switch (accountLog.sourceInfo.type) {
                    case ACCOUNT_LOG_SOURCE.AGENT_CHAT: {
                        // 如果是智能体对话，使用智能体名称
                        const sourceId = String(accountLog.sourceInfo.source);
                        if (agentMap.has(sourceId)) {
                            consumeSourceDesc = agentMap.get(sourceId);
                        } else {
                            consumeSourceDesc = `智能体(${accountLog.sourceInfo.source})`;
                        }
                        break;
                    }

                    default:
                        consumeSourceDesc = accountLog.sourceInfo.source;
                }
            }

            return {
                ...accountLog,
                accountTypeDesc,
                associationUser,
                consumeSourceDesc,
            };
        });
    }
}
