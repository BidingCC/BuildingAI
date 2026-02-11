import { useAuthStore } from "@buildingai/stores";
import type { InfiniteData } from "@tanstack/react-query";
import type {
    UseInfiniteQueryResult,
    UseMutationResult,
    UseQueryResult,
} from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type CreateEmptyDatasetParams = {
    name: string;
    description?: string;
    coverUrl?: string;
};

export type UpdateDatasetParams = {
    name?: string;
    description?: string;
    coverUrl?: string;
};

export type SquarePublishStatus = "none" | "pending" | "approved" | "rejected";

export type Dataset = {
    id: string;
    name: string;
    description: string | null;
    coverUrl?: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    documentCount: number;
    chunkCount: number;
    storageSize: number;
    publishedToSquare: boolean;
    publishedAt: string | null;
    squarePublishStatus?: SquarePublishStatus;
    squareReviewedAt?: string | null;
    squareRejectReason?: string | null;
    memberJoinApprovalRequired?: boolean;
    embeddingModelId?: string | null;
    retrievalMode?: string;
    retrievalConfig?: Record<string, unknown>;
    relatedAgentCount?: number;
    memberCount?: number;
    isOwner?: boolean;
    isMember?: boolean;
    canManageDocuments?: boolean;
    creator?: { id: string; nickname: string | null; avatar: string | null } | null;
    tags?: Array<{ id: string; name: string }>;
    [key: string]: unknown;
};

export type ListDatasetsParams = {
    page?: number;
    pageSize?: number;
};

export type ListSquareDatasetsParams = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    tagIds?: string[];
};

export type ListDatasetsResult = {
    items: Dataset[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type RetrieveParams = {
    query: string;
    topK?: number;
    scoreThreshold?: number;
};

export type RetrievalChunk = {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
    sources?: string[];
    chunkIndex?: number;
    contentLength?: number;
    fileName?: string;
    highlight?: string;
};

export type RetrievalResult = {
    chunks: RetrievalChunk[];
    totalTime: number;
};

export async function listMyCreatedDatasets(
    params?: ListDatasetsParams,
): Promise<ListDatasetsResult> {
    return apiHttpClient.get<ListDatasetsResult>("/ai-datasets/my-created", { params });
}

export async function listTeamDatasets(params?: ListDatasetsParams): Promise<ListDatasetsResult> {
    return apiHttpClient.get<ListDatasetsResult>("/ai-datasets/team", { params });
}

export async function listSquareDatasets(
    params?: ListSquareDatasetsParams,
): Promise<ListDatasetsResult> {
    const search = new URLSearchParams();
    const page = params?.page;
    const pageSize = params?.pageSize;
    const keyword = params?.keyword;
    const tagIds = params?.tagIds;
    if (page) search.set("page", String(page));
    if (pageSize) search.set("pageSize", String(pageSize));
    if (keyword?.trim()) search.set("keyword", keyword.trim());
    if (tagIds?.length) tagIds.forEach((id) => search.append("tagIds", id));
    const qs = search.toString();
    return apiHttpClient.get<ListDatasetsResult>(
        qs ? `/ai-datasets/square?${qs}` : "/ai-datasets/square",
    );
}

const MY_CREATED_LIST_KEY = ["datasets", "my-created"] as const;
const TEAM_LIST_KEY = ["datasets", "team"] as const;
const SQUARE_LIST_KEY = ["datasets", "square"] as const;

export function useMyCreatedDatasetsInfiniteQuery(
    pageSize = 20,
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<ListDatasetsResult>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useInfiniteQuery<ListDatasetsResult>({
        queryKey: [...MY_CREATED_LIST_KEY, pageSize],
        queryFn: ({ pageParam }) => listMyCreatedDatasets({ page: pageParam as number, pageSize }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useTeamDatasetsInfiniteQuery(
    pageSize = 20,
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<ListDatasetsResult>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useInfiniteQuery<ListDatasetsResult>({
        queryKey: [...TEAM_LIST_KEY, pageSize],
        queryFn: ({ pageParam }) => listTeamDatasets({ page: pageParam as number, pageSize }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useSquareDatasetsInfiniteQuery(
    params: { pageSize?: number; keyword?: string; tagIds?: string[] } = {},
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<ListDatasetsResult>, unknown> {
    const { pageSize = 20, keyword, tagIds } = params;
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useInfiniteQuery<ListDatasetsResult>({
        queryKey: [...SQUARE_LIST_KEY, pageSize, keyword ?? "", tagIds ?? []],
        queryFn: ({ pageParam }) =>
            listSquareDatasets({ page: pageParam as number, pageSize, keyword, tagIds }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });
}

export async function getDatasetDetail(datasetId: string): Promise<Dataset> {
    return apiHttpClient.get<Dataset>(`/ai-datasets/${datasetId}`);
}

export function useDatasetDetail(
    datasetId: string | undefined,
    options?: { enabled?: boolean },
): UseQueryResult<Dataset, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<Dataset>({
        queryKey: ["datasets", datasetId],
        queryFn: () => getDatasetDetail(datasetId!),
        enabled: !!datasetId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

export async function createEmptyDataset(params: CreateEmptyDatasetParams): Promise<Dataset> {
    return apiHttpClient.post<Dataset>(`/ai-datasets/create-empty`, params);
}

export async function updateDataset(
    datasetId: string,
    params: UpdateDatasetParams,
): Promise<Dataset> {
    return apiHttpClient.patch<Dataset>(`/ai-datasets/${datasetId}`, params);
}

export async function retrieveDataset(
    datasetId: string,
    params: RetrieveParams,
): Promise<RetrievalResult> {
    return apiHttpClient.post<RetrievalResult>(`/ai-datasets/${datasetId}/retrieve`, params);
}

export type PublishToSquareParams = {
    tagIds: string[];
    memberJoinApprovalRequired?: boolean;
};

export async function publishDatasetToSquare(
    datasetId: string,
    params: PublishToSquareParams,
): Promise<Dataset> {
    return apiHttpClient.post<Dataset>(`/ai-datasets/${datasetId}/publish-to-square`, params);
}

export async function unpublishDatasetFromSquare(datasetId: string): Promise<Dataset> {
    return apiHttpClient.post<Dataset>(`/ai-datasets/${datasetId}/unpublish-from-square`);
}

export function usePublishDatasetToSquare(
    datasetId: string,
): UseMutationResult<Dataset, unknown, PublishToSquareParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: PublishToSquareParams) => publishDatasetToSquare(datasetId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["datasets", datasetId] });
            queryClient.invalidateQueries({ queryKey: ["datasets"] });
        },
    });
}

export function useUnpublishDatasetFromSquare(
    datasetId: string,
): UseMutationResult<Dataset, unknown, void, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => unpublishDatasetFromSquare(datasetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["datasets", datasetId] });
            queryClient.invalidateQueries({ queryKey: ["datasets"] });
        },
    });
}

export async function deleteDataset(datasetId: string): Promise<{ success: boolean }> {
    return apiHttpClient.delete<{ success: boolean }>(`/ai-datasets/${datasetId}`);
}

export function useDeleteDataset(
    datasetId: string,
): UseMutationResult<{ success: boolean }, unknown, void, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => deleteDataset(datasetId),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["datasets", datasetId] });
            queryClient.invalidateQueries({ queryKey: ["datasets"] });
        },
    });
}
