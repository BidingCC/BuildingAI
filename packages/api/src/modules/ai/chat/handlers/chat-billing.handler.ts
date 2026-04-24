import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

const ESTIMATED_TOKENS_PER_ROUND = 500;
const ESTIMATED_TOKENS_TITLE = 50;
const ESTIMATED_TOKENS_MEMORY = 300;
/** Rough estimate for follow-up suggestion generation (aligned with agent billing). */
const ESTIMATED_TOKENS_FOLLOW_UP = 150;

export interface ChatBillingDeductParams {
    userId: string;
    conversationId: string;
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    billingRule: { power: number; tokens: number } | undefined;
}

@Injectable()
export class ChatBillingHandler {
    private readonly logger = new Logger(ChatBillingHandler.name);

    constructor(private readonly appBillingService: AppBillingService) {}

    async validateUserPower(
        userId: string,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<void> {
        if (!userId || !billingRule?.tokens || billingRule.power <= 0) return;

        const currentPower = await this.appBillingService.getSpendablePower(userId);
        const minRequired = this.calculateConsumedPower(ESTIMATED_TOKENS_PER_ROUND, billingRule);
        if (currentPower < minRequired) {
            throw HttpErrorFactory.badRequest("积分不足，请充值后重试");
        }
    }

    calculateConsumedPower(
        totalTokens: number,
        billingRule: { power: number; tokens: number } | undefined,
    ): number {
        if (!billingRule || billingRule.power <= 0 || billingRule.tokens <= 0) return 0;
        return Math.ceil((totalTokens / billingRule.tokens) * billingRule.power);
    }

    async deduct(params: ChatBillingDeductParams): Promise<number> {
        const { userId, conversationId, usage, billingRule } = params;
        if (!userId || !billingRule?.tokens) return 0;

        const totalTokens =
            usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
        if (totalTokens <= 0) return 0;

        const amount = this.calculateConsumedPower(totalTokens, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: ACCOUNT_LOG_TYPE.CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.CHAT,
                    source: "基本对话",
                },
                remark: "基本对话消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Chat billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    async deductForTitleGeneration(
        userId: string | undefined,
        conversationId: string | undefined,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<number> {
        if (!userId || !conversationId || !billingRule?.tokens) return 0;

        const amount = this.calculateConsumedPower(ESTIMATED_TOKENS_TITLE, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: ACCOUNT_LOG_TYPE.CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.CHAT,
                    source: "对话标题生成",
                },
                remark: "对话标题生成消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Chat title billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    async deductForMemoryExtraction(
        userId: string | undefined,
        conversationId: string | undefined,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<number> {
        if (!userId || !conversationId || !billingRule?.tokens) return 0;

        const amount = this.calculateConsumedPower(ESTIMATED_TOKENS_MEMORY, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: ACCOUNT_LOG_TYPE.CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.CHAT,
                    source: "用户记忆提取",
                },
                remark: "用户记忆提取消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Chat memory billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    /**
     * Deduct power for AI-generated follow-up question suggestions after an assistant reply.
     */
    async deductForFollowUpSuggestions(
        userId: string | undefined,
        conversationId: string | undefined,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<number> {
        if (!userId || !conversationId || !billingRule?.tokens) return 0;

        const amount = this.calculateConsumedPower(ESTIMATED_TOKENS_FOLLOW_UP, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: ACCOUNT_LOG_TYPE.CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.CHAT,
                    source: "对话追问建议",
                },
                remark: "对话追问建议消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Chat follow-up suggestions billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }
}
