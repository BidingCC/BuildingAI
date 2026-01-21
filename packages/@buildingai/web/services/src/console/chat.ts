import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConversationStatus = "active" | "completed" | "failed" | "cancelled";

export type ConversationRecord = {
    id: string;
    title: string | null;
    userId: string;
    user?: {
        id: string;
        username: string;
        avatar?: string | null;
        email?: string | null;
    };
    modelId: string | null;
    summary: string | null;
    messageCount: number;
    totalTokens: number;
    totalPower: number;
    config: Record<string, any> | null;
    status: ConversationStatus;
    isPinned: boolean;
    isDeleted: boolean;
    metadata: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
};

export type QueryConversationsParams = {
    page?: number;
    pageSize?: number;
    modelId?: string;
    status?: ConversationStatus;
    isPinned?: boolean;
    keyword?: string;
    username?: string;
    startDate?: string | Date;
    endDate?: string | Date;
};

export type CreateConversationDto = {
    userId: string;
    title?: string;
    summary?: string;
    config?: Record<string, any>;
    isPinned?: boolean;
    metadata?: Record<string, any>;
};

export type UpdateConversationDto = {
    title?: string;
    summary?: string;
    status?: ConversationStatus;
    isPinned?: boolean;
    config?: Record<string, any>;
    metadata?: Record<string, any>;
};

export type BatchDeleteConversationDto = {
    ids: string[];
};

export type ChatConfig = {
    [key: string]: any;
};

export type UpdateChatConfigDto = {
    [key: string]: any;
};

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
    } | null;
    userConsumedPower?: number | null;
    createdAt: string;
    updatedAt: string;
};

export type QueryMessagesParams = {
    page?: number;
    pageSize?: number;
    conversationId: string;
};

export function useConversationsQuery(
    params?: QueryConversationsParams,
    options?: PaginatedQueryOptionsUtil<ConversationRecord>,
) {
    return useQuery<PaginatedResponse<ConversationRecord>>({
        queryKey: ["console", "conversations", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<ConversationRecord>>("/ai-conversations", {
                params: {
                    ...params,
                    startDate: params?.startDate
                        ? typeof params.startDate === "string"
                            ? params.startDate
                            : params.startDate.toISOString()
                        : undefined,
                    endDate: params?.endDate
                        ? typeof params.endDate === "string"
                            ? params.endDate
                            : params.endDate.toISOString()
                        : undefined,
                },
            }),
        ...options,
    });
}

export function useConversationQuery(id: string, options?: QueryOptionsUtil<ConversationRecord>) {
    return useQuery<ConversationRecord>({
        queryKey: ["console", "conversation", id],
        queryFn: () => consoleHttpClient.get<ConversationRecord>(`/ai-conversations/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

export function useChatConfigQuery(options?: QueryOptionsUtil<ChatConfig>) {
    return useQuery<ChatConfig>({
        queryKey: ["console", "chat-config"],
        queryFn: () => consoleHttpClient.get<ChatConfig>("/ai-conversations/config"),
        ...options,
    });
}

export function useUpdateChatConfigMutation(
    options?: MutationOptionsUtil<ChatConfig, UpdateChatConfigDto>,
) {
    const queryClient = useQueryClient();
    return useMutation<ChatConfig, Error, UpdateChatConfigDto>({
        mutationFn: (dto) => consoleHttpClient.put<ChatConfig>("/ai-conversations/config", dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "chat-config"] });
        },
        ...options,
    });
}

export function useCreateConversationMutation(
    options?: MutationOptionsUtil<ConversationRecord, CreateConversationDto>,
) {
    const queryClient = useQueryClient();
    return useMutation<ConversationRecord, Error, CreateConversationDto>({
        mutationFn: (dto) => consoleHttpClient.post<ConversationRecord>("/ai-conversations", dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "conversations"] });
        },
        ...options,
    });
}

export function useUpdateConversationMutation(
    options?: MutationOptionsUtil<ConversationRecord, { id: string; dto: UpdateConversationDto }>,
) {
    const queryClient = useQueryClient();
    return useMutation<ConversationRecord, Error, { id: string; dto: UpdateConversationDto }>({
        mutationFn: ({ id, dto }) =>
            consoleHttpClient.put<ConversationRecord>(`/ai-conversations/${id}`, dto),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["console", "conversations"] });
            queryClient.invalidateQueries({ queryKey: ["console", "conversation", variables.id] });
        },
        ...options,
    });
}

export function useDeleteConversationMutation(
    options?: MutationOptionsUtil<{ message: string }, string>,
) {
    const queryClient = useQueryClient();
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.delete<{ message: string }>(`/ai-conversations/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "conversations"] });
        },
        ...options,
    });
}

export function useBatchDeleteConversationsMutation(
    options?: MutationOptionsUtil<
        { success: boolean; message: string },
        BatchDeleteConversationDto
    >,
) {
    const queryClient = useQueryClient();
    return useMutation<{ success: boolean; message: string }, Error, BatchDeleteConversationDto>({
        mutationFn: (dto) =>
            consoleHttpClient.post<{ success: boolean; message: string }>(
                "/ai-conversations/batch-delete",
                dto,
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "conversations"] });
        },
        ...options,
    });
}

export function useConversationMessagesQuery(
    params: QueryMessagesParams,
    options?: PaginatedQueryOptionsUtil<MessageRecord>,
) {
    return useQuery<PaginatedResponse<MessageRecord>>({
        queryKey: ["console", "conversation-messages", params.conversationId, params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<MessageRecord>>(
                `/ai-conversations/${params.conversationId}/messages`,
                {
                    params: {
                        page: params.page,
                        pageSize: params.pageSize,
                    },
                },
            ),
        enabled: !!params.conversationId && options?.enabled !== false,
        ...options,
    });
}
