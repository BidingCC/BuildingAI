import { useAuthStore } from "@buildingai/stores";
import type {
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
 * 消息版本类型
 */
export type MessageVersion = {
    id: string;
    content: string;
    attachments?: Array<{
        type: "file";
        url: string;
        mediaType?: string;
        filename?: string;
    }>;
};

/**
 * 信息来源类型
 */
export type MessageSource = {
    href: string;
    title: string;
};

/**
 * AI推理过程类型
 */
export type MessageReasoning = {
    content: string;
    duration: number;
};

/**
 * 工具调用类型
 */
export type MessageToolCall = {
    name: string;
    description: string;
    status:
        | "input-streaming"
        | "input-available"
        | "approval-requested"
        | "approval-responded"
        | "output-available"
        | "output-error"
        | "output-denied";
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
};

/**
 * 消息记录类型
 */
export type MessageRecord = {
    id: string;
    conversationId: string;
    modelId: string;
    role: "user" | "assistant";
    sequence: number;
    parentId?: string | null;
    message: {
        role: "user" | "assistant" | "system" | "tool";
        parts: Array<{
            type: string;
            [key: string]: any;
        }>;
        metadata?: Record<string, any>;
    };
    status: "streaming" | "completed" | "failed";
    errorMessage?: string | null;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    } | null;
    userConsumedPower?: number | null;
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
    const { isLogin } = useAuthStore((state) => state.authActions);

    return useQuery<PaginatedResponse<ConversationRecord>>({
        queryKey: ["conversations", params],
        queryFn: () =>
            apiHttpClient.get<PaginatedResponse<ConversationRecord>>("/ai-conversations", {
                params,
            }),
        enabled: isLogin() && options?.enabled !== false,
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
        ...options,
        enabled: options?.enabled ?? false,
    });
}

/**
 * 删除会话
 */
export function useDeleteConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (conversationId: string) =>
            apiHttpClient.delete(`/ai-conversations/${conversationId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

/**
 * 更新会话
 */
export function useUpdateConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, title }: { id: string; title: string }) =>
            apiHttpClient.patch<ConversationRecord>(`/ai-conversations/${id}`, { title }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["conversation", variables.id] });
        },
    });
}
