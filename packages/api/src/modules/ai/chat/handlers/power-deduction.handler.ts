import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AiModel } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Power calculation result
 */
export interface PowerCalculationResult {
    userConsumedPower: number;
    totalTokens: number;
}

/**
 * Power Deduction Command Handler
 *
 * Handles user power calculation and deduction with transaction support.
 */
@Injectable()
export class PowerDeductionCommandHandler {
    private readonly logger = new Logger(PowerDeductionCommandHandler.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly appBillingService: AppBillingService,
    ) {}

    /**
     * Calculate consumed power based on tokens and billing rule
     *
     * @param totalTokens - Total tokens used
     * @param billingRule - Model's billing rule
     * @returns Consumed power amount
     */
    calculateConsumedPower(
        totalTokens: number,
        billingRule: { power: number; tokens: number },
    ): number {
        if (!billingRule || billingRule.power <= 0 || billingRule.tokens <= 0) {
            return 0;
        }

        return Math.ceil((totalTokens / billingRule.tokens) * billingRule.power);
    }

    /**
     * Deduct user power with transaction and logging
     *
     * @param userId - User ID
     * @param userInfo - Current user info
     * @param model - AI Model
     * @param consumedPower - Power to deduct
     * @param totalTokens - Total tokens used
     */
    async deductUserPower(
        userId: string,
        userInfo: User,
        model: AiModel,
        consumedPower: number,
        totalTokens: number,
    ): Promise<void> {
        if (consumedPower <= 0) {
            return;
        }

        try {
            await this.userRepository.manager.transaction(async (entityManager) => {
                // Calculate new power, ensure it doesn't go negative
                const newPower = Math.max(0, userInfo.power - consumedPower);
                // Actual deducted power (may be less than consumedPower if insufficient)
                const actualDeducted = userInfo.power - newPower;

                await this.appBillingService.deductUserPower(
                    {
                        amount: actualDeducted,
                        accountType: ACCOUNT_LOG_TYPE.CHAT_DEC,
                        userId,
                        source: {
                            type: ACCOUNT_LOG_SOURCE.CHAT,
                            source: "基本对话",
                        },
                        remark: `基本对话消耗（模型：${model.name}，Token数：${totalTokens}）`,
                    },
                    entityManager,
                );

                this.logger.debug(`用户 ${userId} 对话扣除积分 ${actualDeducted} 成功`);

                // Log warning if actual deduction is less than expected
                if (actualDeducted < consumedPower) {
                    this.logger.warn(
                        `用户 ${userId} 积分不足，应扣除 ${consumedPower}，实际扣除 ${actualDeducted}，当前积分为0`,
                    );
                }
            });
        } catch (error) {
            this.logger.error(`扣除用户积分失败: ${error.message}`, error.stack);
            // Don't throw error since chat is already completed
            // Log error for manual handling later
        }
    }
}
