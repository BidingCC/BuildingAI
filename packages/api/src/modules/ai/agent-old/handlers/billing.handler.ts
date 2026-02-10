import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

import { IBillingHandler } from "../interfaces/chat-handlers.interface";
import { AiAgentChatRecordService } from "../services/ai-agent-chat-record.service";
import { UserUtil } from "../utils/user.util";

/**
 * 计费处理器
 * 负责处理智能体聊天的积分扣费逻辑
 */
@Injectable()
export class BillingHandler implements IBillingHandler {
    private readonly logger = new Logger(BillingHandler.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly AiAgentChatRecordService: AiAgentChatRecordService,
        private readonly appBillingService: AppBillingService,
    ) {}

    /**
     * 扣除智能体聊天积分
     */
    async deductAgentChatPower(
        agentInfo: Partial<Agent>,
        billToUser: User | null,
        user: UserPlayground,
        conversationRecord?: AgentChatRecord | null,
    ): Promise<void> {
        if (!billToUser || !agentInfo.billingConfig?.price) {
            return;
        }

        try {
            await this.userRepository.manager.transaction(async (entityManager) => {
                // 计算扣费金额
                const deductAmount = agentInfo.billingConfig.price;
                const newPower = Math.max(0, billToUser.power - deductAmount);
                const actualDeducted = billToUser.power - newPower;

                await this.appBillingService.deductUserPower(
                    {
                        amount: actualDeducted,
                        accountType: UserUtil.isAnonymousUser(user)
                            ? ACCOUNT_LOG_TYPE.AGENT_GUEST_CHAT_DEC
                            : ACCOUNT_LOG_TYPE.AGENT_CHAT_DEC,
                        userId: billToUser.id,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.AGENT_CHAT,
                            source: agentInfo.id,
                        },
                        remark: `${UserUtil.isAnonymousUser(user) ? "匿名用户" : "用户"}：${user.username} 调用${agentInfo.name}智能体对话`,
                    },
                    entityManager,
                );

                // 更新对话记录的消费积分
                if (conversationRecord && actualDeducted > 0) {
                    await this.AiAgentChatRecordService.incrementConsumedPower(
                        conversationRecord.id,
                        actualDeducted,
                    );
                }
            });
        } catch (error) {
            this.logger.error(`扣除用户积分失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 检查是否为匿名用户
     */
}
