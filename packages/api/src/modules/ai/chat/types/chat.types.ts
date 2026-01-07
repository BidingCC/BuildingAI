/**
 * AI SDK 兼容的对话类型定义
 *
 * 这些类型与 @ai-sdk/react 的 useChat hook 完全兼容
 * 参考: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
 */

import type { AiChatMessage, AiChatRecord, AiModel, AiProvider } from "@buildingai/db/entities";
import type { FinishReason, LanguageModelUsage, ModelMessage, UIMessage } from "ai";

// ==================== Re-export AI SDK Types ====================

export type { FinishReason, LanguageModelUsage, ModelMessage, UIMessage };

// ==================== Internal Types ====================

/**
 * 模型配置（包含 Provider 信息）
 */
export interface ModelWithProvider {
    model: AiModel;
    provider: AiProvider;
    apiKey: string;
    baseURL?: string;
}

/**
 * 对话上下文
 */
export interface ChatContext {
    /** 对话ID */
    conversationId: string;
    /** 用户ID */
    userId: string;
    /** 模型配置 */
    modelConfig: ModelWithProvider;
    /** 是否保存对话 */
    saveConversation: boolean;
    /** 请求开始时间 */
    startTime: number;
    /** AbortSignal 用于取消请求 */
    abortSignal?: AbortSignal;
}

/**
 * 消息保存参数
 */
export interface SaveMessageParams {
    conversationId: string;
    modelId: string;
    role: AiChatMessage["role"];
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: FinishReason;
    consumedPower?: number;
    processingTime?: number;
    status?: AiChatMessage["status"];
    errorMessage?: string;
    parentMessageId?: string;
}

/**
 * 对话请求参数（内部使用）
 */
export interface ChatCompletionParams {
    /** 用户ID */
    userId: string;
    /** 对话ID（可选，不传则创建新对话） */
    conversationId?: string;
    /** 模型ID */
    modelId: string;
    /** 消息列表 (AI SDK UIMessage 格式) */
    messages: UIMessage[];
    /** 对话标题（新建对话时） */
    title?: string;
    /** 是否保存对话记录 */
    saveConversation?: boolean;
    /** 系统提示词 */
    systemPrompt?: string;
    /** MCP服务器ID列表（预留） */
    mcpServers?: string[];
    /** AbortSignal 用于取消请求 */
    abortSignal?: AbortSignal;
}

/**
 * 对话创建结果
 */
export interface ConversationResult {
    conversation: AiChatRecord;
    isNew: boolean;
}

/**
 * Token 使用量（内部格式）
 */
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
}

/**
 * 将 AI SDK LanguageModelUsage 转换为内部 TokenUsage
 */
export function convertUsage(usage: LanguageModelUsage): TokenUsage {
    return {
        promptTokens: usage.inputTokens || 0,
        completionTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
        cachedTokens: usage.inputTokenDetails?.cacheReadTokens,
    };
}

/**
 * 计费规则
 */
export interface BillingRule {
    power: number;
    tokens: number;
}

/**
 * 计算消耗的积分
 */
export function calculatePower(usage: TokenUsage, billingRule: BillingRule): number {
    if (!billingRule || billingRule.tokens === 0) {
        return 0;
    }
    return Math.ceil((usage.totalTokens / billingRule.tokens) * billingRule.power);
}
