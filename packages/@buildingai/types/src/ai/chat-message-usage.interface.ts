/**
 * 对话消息 Token 使用情况
 * 与 AI SDK / OpenAI usage 结构对齐，供 ai_chat_message、datasets_chat_message， ai_agent_chat_message 等实体共用
 */
export interface ChatMessageUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    inputTokenDetails?: {
        noCacheTokens?: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
    };
    outputTokenDetails?: {
        textTokens?: number;
        reasoningTokens?: number;
    };
    reasoningTokens?: number;
    cachedInputTokens?: number;
    raw?: Record<string, unknown>;
}
