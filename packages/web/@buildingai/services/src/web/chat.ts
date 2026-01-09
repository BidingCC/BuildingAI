import type {
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

/**
 * 分页查询参数
 */
export type PaginationParams = {
    page?: number;
    pageSize?: number;
};

/**
 * 会话记录类型
 */
export type ConversationRecord = {
    id: string;
    title: string | null;
    userId: string;
    modelId: string | null;
    summary: string | null;
    messageCount: number;
    totalTokens: number;
    totalPower: number;
    config: Record<string, any> | null;
    status: "active" | "completed" | "failed" | "cancelled";
    isPinned: boolean;
    isDeleted: boolean;
    metadata: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
};

/**
 * 查询会话列表参数
 */
export type QueryConversationsParams = PaginationParams & {
    modelId?: string;
    status?: "active" | "completed" | "failed" | "cancelled";
    isPinned?: boolean;
    keyword?: string;
    startDate?: string;
    endDate?: string;
};

/**
 * 消息记录类型
 */
export type MessageRecord = {
    id: string;
    conversationId: string;
    modelId: string;
    role: "system" | "user" | "assistant" | "tool" | "function" | "data";
    name?: string | null;
    toolCallId?: string | null;
    parentMessageId?: string | null;
    content: any;
    messageType: "text" | "image" | "file";
    attachments?: any[] | null;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        cachedTokens?: number;
    } | null;
    finishReason?: "stop" | "length" | "tool-calls" | "content-filter" | "error" | "other" | null;
    userConsumedPower?: number | null;
    status: "sending" | "streaming" | "completed" | "failed" | "cancelled";
    errorMessage?: string | null;
    sequence: number;
    processingTime?: number | null;
    rawResponse?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
    toolCalls?: any[] | null;
    reasoning?: {
        content?: string;
        startTime?: number;
        endTime?: number;
    } | null;
    createdAt: string;
    updatedAt: string;
};

/**
 * 查询消息列表参数
 */
export type QueryMessagesParams = PaginationParams & {
    conversationId: string;
};

/**
 * 获取会话列表
 */
export function useConversationsQuery(
    params: QueryConversationsParams,
    options?: PaginatedQueryOptionsUtil<ConversationRecord>,
) {
    return useQuery<PaginatedResponse<ConversationRecord>>({
        queryKey: ["conversations", params],
        queryFn: () =>
            apiHttpClient.get<PaginatedResponse<ConversationRecord>>("/ai-conversations", {
                params,
            }),
        ...options,
    });
}

/**
 * 获取会话详情
 */
export function useConversationQuery(
    conversationId: string,
    options?: QueryOptionsUtil<ConversationRecord>,
) {
    return useQuery<ConversationRecord>({
        queryKey: ["conversation", conversationId],
        queryFn: () => apiHttpClient.get<ConversationRecord>(`/ai-conversations/${conversationId}`),
        enabled: !!conversationId,
        ...options,
    });
}

/**
 * 获取会话消息列表
 */
export function useConversationMessagesQuery(
    params: QueryMessagesParams,
    options?: PaginatedQueryOptionsUtil<MessageRecord>,
) {
    return useQuery<PaginatedResponse<MessageRecord>>({
        queryKey: ["conversation-messages", params.conversationId, params],
        queryFn: () =>
            apiHttpClient.get<PaginatedResponse<MessageRecord>>(
                `/ai-conversations/${params.conversationId}/messages`,
                {
                    params: {
                        page: params.page,
                        pageSize: params.pageSize,
                    },
                },
            ),
        enabled: !!params.conversationId,
        ...options,
    });
}
