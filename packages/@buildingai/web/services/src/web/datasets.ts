import { useAuthStore } from "@buildingai/stores";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

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
    embeddingModelId?: string | null;
    retrievalMode?: string;
    retrievalConfig?: Record<string, unknown>;
    relatedAgentCount?: number;
    memberCount?: number;
    isOwner?: boolean;
    creator?: { id: string; nickname: string | null; avatar: string | null } | null;
    [key: string]: unknown;
};

export type ListDatasetsParams = {
    page?: number;
    pageSize?: number;
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

export async function publishDatasetToSquare(datasetId: string): Promise<Dataset> {
    return apiHttpClient.post<Dataset>(`/ai-datasets/${datasetId}/publish-to-square`);
}

export async function unpublishDatasetFromSquare(datasetId: string): Promise<Dataset> {
    return apiHttpClient.post<Dataset>(`/ai-datasets/${datasetId}/unpublish-from-square`);
}
