import { useAuthStore } from "@buildingai/stores";
import type {
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type DatasetsConversationStatus = "active" | "completed" | "failed" | "cancelled";

export type DatasetsConversationRecord = {
    id: string;
    datasetId: string;
    userId: string;
    title: string | null;
    modelId: string | null;
    summary: string | null;
    messageCount: number;
    totalTokens: number;
    config: Record<string, unknown> | null;
    status: DatasetsConversationStatus;
    isDeleted: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
};

export type CreateDatasetsConversationParams = {
    title?: string;
    summary?: string;
    modelId?: string;
    config?: Record<string, unknown>;
};

export type UpdateDatasetsConversationParams = {
    title?: string;
    summary?: string;
    status?: DatasetsConversationStatus;
    config?: Record<string, unknown>;
};

export type QueryDatasetsConversationsParams = {
    page?: number;
    pageSize?: number;
    status?: DatasetsConversationStatus;
    keyword?: string;
};

export type DatasetsMessageRecord = {
    id: string;
    conversationId: string;
    modelId: string;
    role: "user" | "assistant";
    sequence: number;
    parentId?: string | null;
    message: {
        role: "user" | "assistant" | "system" | "tool";
        parts: Array<{ type: string; [key: string]: unknown }>;
        metadata?: Record<string, unknown>;
    };
    status: "streaming" | "completed" | "failed";
    errorMessage?: string | null;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        inputTokenDetails?: Record<string, number>;
        outputTokenDetails?: Record<string, number>;
        reasoningTokens?: number;
        cachedInputTokens?: number;
        raw?: Record<string, unknown>;
    } | null;
    createdAt: string;
    updatedAt: string;
};

export async function getDatasetsConversations(
    datasetId: string,
    params?: QueryDatasetsConversationsParams,
): Promise<PaginatedResponse<DatasetsConversationRecord>> {
    return apiHttpClient.get<PaginatedResponse<DatasetsConversationRecord>>(
        `/ai-datasets/${datasetId}/conversations`,
        { params: params ?? {} },
    );
}

export async function createDatasetsConversation(
    datasetId: string,
    params?: CreateDatasetsConversationParams,
): Promise<DatasetsConversationRecord> {
    return apiHttpClient.post<DatasetsConversationRecord>(
        `/ai-datasets/${datasetId}/conversations`,
        params ?? {},
    );
}

export async function getDatasetsConversationDetail(
    datasetId: string,
    conversationId: string,
): Promise<DatasetsConversationRecord> {
    return apiHttpClient.get<DatasetsConversationRecord>(
        `/ai-datasets/${datasetId}/conversations/${conversationId}`,
    );
}

export async function getDatasetsConversationInfo(
    datasetId: string,
    conversationId: string,
): Promise<DatasetsConversationRecord> {
    return apiHttpClient.get<DatasetsConversationRecord>(
        `/ai-datasets/${datasetId}/conversations/${conversationId}/info`,
    );
}

export async function updateDatasetsConversation(
    datasetId: string,
    conversationId: string,
    params: UpdateDatasetsConversationParams,
): Promise<DatasetsConversationRecord> {
    return apiHttpClient.patch<DatasetsConversationRecord>(
        `/ai-datasets/${datasetId}/conversations/${conversationId}`,
        params,
    );
}

export async function deleteDatasetsConversation(
    datasetId: string,
    conversationId: string,
): Promise<{ message: string }> {
    return apiHttpClient.delete<{ message: string }>(
        `/ai-datasets/${datasetId}/conversations/${conversationId}`,
    );
}

export async function getDatasetsConversationMessages(
    datasetId: string,
    conversationId: string,
    params?: { page?: number; pageSize?: number },
): Promise<PaginatedResponse<DatasetsMessageRecord>> {
    return apiHttpClient.get<PaginatedResponse<DatasetsMessageRecord>>(
        `/ai-datasets/${datasetId}/conversations/${conversationId}/messages`,
        { params: params ?? {} },
    );
}

export function useDatasetsConversationsQuery(
    datasetId: string,
    params: QueryDatasetsConversationsParams,
    options?: PaginatedQueryOptionsUtil<DatasetsConversationRecord>,
): UseQueryResult<PaginatedResponse<DatasetsConversationRecord>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<PaginatedResponse<DatasetsConversationRecord>>({
        queryKey: ["datasets", datasetId, "conversations", params],
        queryFn: () => getDatasetsConversations(datasetId, params),
        enabled: !!datasetId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useDatasetsConversationDetailQuery(
    datasetId: string,
    conversationId: string,
    options?: QueryOptionsUtil<DatasetsConversationRecord>,
): UseQueryResult<DatasetsConversationRecord, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<DatasetsConversationRecord>({
        queryKey: ["datasets", datasetId, "conversation", conversationId],
        queryFn: () => getDatasetsConversationDetail(datasetId, conversationId),
        enabled: !!datasetId && !!conversationId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useDatasetsConversationMessagesQuery(
    datasetId: string,
    conversationId: string,
    params?: { page?: number; pageSize?: number },
    options?: PaginatedQueryOptionsUtil<DatasetsMessageRecord>,
): UseQueryResult<PaginatedResponse<DatasetsMessageRecord>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<PaginatedResponse<DatasetsMessageRecord>>({
        queryKey: ["datasets", datasetId, "conversation-messages", conversationId, params],
        queryFn: () => getDatasetsConversationMessages(datasetId, conversationId, params ?? {}),
        enabled: !!datasetId && !!conversationId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useCreateDatasetsConversation(
    datasetId: string,
): UseMutationResult<
    DatasetsConversationRecord,
    unknown,
    CreateDatasetsConversationParams | undefined,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params) => createDatasetsConversation(datasetId, params),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "conversations"],
            });
        },
    });
}

export function useUpdateDatasetsConversation(datasetId: string): UseMutationResult<
    DatasetsConversationRecord,
    unknown,
    {
        conversationId: string;
        params: UpdateDatasetsConversationParams;
    },
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ conversationId, params }) =>
            updateDatasetsConversation(datasetId, conversationId, params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "conversations"],
            });
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "conversation", variables.conversationId],
            });
        },
    });
}

export function useDeleteDatasetsConversation(
    datasetId: string,
): UseMutationResult<{ message: string }, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (conversationId: string) =>
            deleteDatasetsConversation(datasetId, conversationId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "conversations"],
            });
        },
    });
}
