import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";
import type { StopCondition, ToolSet } from "ai";

const ESTIMATED_TOKENS_PER_ROUND = 500;
const ESTIMATED_TOKENS_MEMORY = 300;
const ESTIMATED_TOKENS_PLANNING = 400;
const ESTIMATED_TOKENS_FOLLOW_UP = 150;

export interface AgentBillingDeductParams {
    userId: string;
    conversationId: string;
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    billingRule: { power: number; tokens: number } | undefined;
    isGuest?: boolean;
}

@Injectable()
export class AgentBillingHandler {
    private readonly logger = new Logger(AgentBillingHandler.name);

    constructor(private readonly appBillingService: AppBillingService) {}

    /**
     * Admission check. Returns the spendable power the turn may consume (its budget), or
     * undefined when the model is not billed.
     */
    async validateUserPower(
        userId: string,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<number | undefined> {
        if (!userId || !billingRule?.tokens || billingRule.power <= 0) return undefined;

        const currentPower = await this.appBillingService.getSpendablePower(userId);
        const minRequired = this.calculateConsumedPower(ESTIMATED_TOKENS_PER_ROUND, billingRule);
        if (currentPower < minRequired) {
            throw HttpErrorFactory.badRequest("积分不足，请充值后重试");
        }
        return currentPower;
    }

    /**
     * Admission once the prompt is known: the first step alone sends the whole prompt, so the
     * budget must cover the prompt plus one round of output, not a fixed 500-token estimate.
     */
    assertBudgetCoversPrompt(
        budget: number | undefined,
        promptTokens: number,
        billingRule: { power: number; tokens: number } | undefined,
    ): void {
        if (budget === undefined) return;
        const required = this.calculateConsumedPower(
            promptTokens + ESTIMATED_TOKENS_PER_ROUND,
            billingRule,
        );
        if (budget < required) {
            throw HttpErrorFactory.badRequest("积分不足，请充值后重试");
        }
    }

    /**
     * Stop condition for the tool loop: every further step re-sends the whole conversation, so it
     * costs at least as much as the last one. Stop before a step the admitted budget cannot pay.
     */
    stopWhenBudgetExhausted<TOOLS extends ToolSet = ToolSet>(
        budget: number | undefined,
        billingRule: { power: number; tokens: number } | undefined,
    ): StopCondition<TOOLS> {
        const stepTokens = (usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
        }) => usage?.totalTokens ?? (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
        return ({ steps }) => {
            if (budget === undefined || steps.length === 0) return false;
            const spent = steps.reduce((sum, step) => sum + stepTokens(step.usage), 0);
            const next = stepTokens(steps[steps.length - 1].usage);
            return this.calculateConsumedPower(spent + next, billingRule) > budget;
        };
    }

    calculateConsumedPower(
        totalTokens: number,
        billingRule: { power: number; tokens: number } | undefined,
    ): number {
        if (!billingRule || billingRule.power <= 0 || billingRule.tokens <= 0) return 0;
        return Math.ceil((totalTokens / billingRule.tokens) * billingRule.power);
    }

    async deduct(params: AgentBillingDeductParams): Promise<number> {
        const { userId, conversationId, usage, billingRule, isGuest } = params;
        if (!userId || !billingRule?.tokens) return 0;

        const totalTokens =
            usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
        if (totalTokens <= 0) return 0;

        const amount = this.calculateConsumedPower(totalTokens, billingRule);
        if (amount <= 0) return 0;

        try {
            // The turn was already delivered: settle it even when the balance is short
            // (deduct what is left) instead of refusing and charging nothing.
            const deducted = await this.appBillingService.deductUserPower({
                userId,
                amount,
                allowPartial: true,
                accountType: isGuest
                    ? ACCOUNT_LOG_TYPE.AGENT_GUEST_CHAT_DEC
                    : ACCOUNT_LOG_TYPE.AGENT_CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.AGENT_CHAT,
                    source: "智能体对话",
                },
                remark: "智能体对话消耗",
                associationNo: conversationId,
            });
            return deducted;
        } catch (error) {
            this.logger.warn(
                `Agent billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    async deductForMemoryExtraction(
        userId: string | undefined,
        conversationId: string | undefined,
        billingRule: { power: number; tokens: number } | undefined,
        isGuest?: boolean,
    ): Promise<number> {
        if (!userId || !conversationId || !billingRule?.tokens) return 0;

        const amount = this.calculateConsumedPower(ESTIMATED_TOKENS_MEMORY, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: isGuest
                    ? ACCOUNT_LOG_TYPE.AGENT_GUEST_CHAT_DEC
                    : ACCOUNT_LOG_TYPE.AGENT_CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.AGENT_CHAT,
                    source: "智能体记忆提取",
                },
                remark: "智能体记忆提取消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Agent memory billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    async deductForPlanning(
        userId: string | undefined,
        conversationId: string | undefined,
        billingRule: { power: number; tokens: number } | undefined,
        isGuest?: boolean,
    ): Promise<number> {
        if (!userId || !conversationId || !billingRule?.tokens) return 0;

        const amount = this.calculateConsumedPower(ESTIMATED_TOKENS_PLANNING, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: isGuest
                    ? ACCOUNT_LOG_TYPE.AGENT_GUEST_CHAT_DEC
                    : ACCOUNT_LOG_TYPE.AGENT_CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.AGENT_CHAT,
                    source: "智能体规划",
                },
                remark: "智能体规划消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Agent planning billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    async deductForFollowUpSuggestions(
        userId: string | undefined,
        conversationId: string | undefined,
        billingRule: { power: number; tokens: number } | undefined,
        isGuest?: boolean,
    ): Promise<number> {
        if (!userId || !conversationId || !billingRule?.tokens) return 0;

        const amount = this.calculateConsumedPower(ESTIMATED_TOKENS_FOLLOW_UP, billingRule);
        if (amount <= 0) return 0;

        try {
            await this.appBillingService.deductUserPower({
                userId,
                amount,
                accountType: isGuest
                    ? ACCOUNT_LOG_TYPE.AGENT_GUEST_CHAT_DEC
                    : ACCOUNT_LOG_TYPE.AGENT_CHAT_DEC,
                source: {
                    type: ACCOUNT_LOG_SOURCE.AGENT_CHAT,
                    source: "智能体追问建议",
                },
                remark: "智能体追问建议消耗",
                associationNo: conversationId,
            });
            return amount;
        } catch (error) {
            this.logger.warn(
                `Agent follow-up suggestions billing deduct failed: userId=${userId}, amount=${amount}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }
}
