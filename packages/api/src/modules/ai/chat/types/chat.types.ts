import type { AiChatMessage, AiChatRecord, AiModel, AiProvider } from "@buildingai/db/entities";
import type { FinishReason, LanguageModelUsage, ModelMessage, UIMessage } from "ai";

export type { FinishReason, LanguageModelUsage, ModelMessage, UIMessage };

export interface ModelWithProvider {
    model: AiModel;
    provider: AiProvider;
    apiKey: string;
    baseURL?: string;
}

export interface ChatContext {
    conversationId: string;
    userId: string;
    modelConfig: ModelWithProvider;
    saveConversation: boolean;
    startTime: number;
    abortSignal?: AbortSignal;
}

export interface SaveMessageParams {
    conversationId: string;
    modelId: string;
    message: UIMessage;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    consumedPower?: number;
    status?: AiChatMessage["status"];
    errorMessage?: string;
    parentId?: string;
}

export interface ChatCompletionParams {
    userId: string;
    conversationId?: string;
    modelId: string;
    messages: UIMessage[];
    title?: string;
    saveConversation?: boolean;
    systemPrompt?: string;
    mcpServers?: string[];
    abortSignal?: AbortSignal;
    isRegenerate?: boolean;
    regenerateMessageId?: string;
    regenerateParentId?: string;
    parentId?: string;
    isToolApprovalFlow?: boolean;
}

export interface ConversationResult {
    conversation: AiChatRecord;
    isNew: boolean;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cachedTokens?: number;
}

export function convertUsage(usage: LanguageModelUsage): TokenUsage {
    return {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
        cachedTokens: usage.inputTokenDetails?.cacheReadTokens,
    };
}

export interface BillingRule {
    power: number;
    tokens: number;
}

export function calculatePower(usage: TokenUsage, billingRule: BillingRule): number {
    if (!billingRule || billingRule.tokens === 0) return 0;
    return Math.ceil((usage.totalTokens / billingRule.tokens) * billingRule.power);
}
