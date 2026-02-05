import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConsoleDatasetVectorConfig = {
    id: string;
    name: string;
    embeddingModelId: string | null;
    retrievalMode: string;
    retrievalConfig: Record<string, unknown>;
};

export type SetDatasetVectorConfigDto = {
    embeddingModelId?: string;
    retrievalMode?: string;
    retrievalConfig?: Record<string, unknown>;
};

export type ConsoleDatasetStatus = "all" | "none" | "pending" | "approved" | "rejected";

export type ConsoleDatasetItem = {
    id: string;
    name: string;
    creatorName: string;
    documentCount: number;
    storageSize: number;
    storageSizeFormatted: string;
    squarePublishStatus: string;
    squareRejectReason?: string | null;
    sort: number;
    updatedAt: string;
};

export type QueryConsoleDatasetsDto = {
    page?: number;
    pageSize?: number;
    name?: string;
    status?: ConsoleDatasetStatus;
};

export function useConsoleDatasetsListQuery(
    params?: QueryConsoleDatasetsDto,
    options?: PaginatedQueryOptionsUtil<ConsoleDatasetItem>,
) {
    return useQuery({
        queryKey: ["console", "datasets", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<ConsoleDatasetItem>>("/datasets", {
                params,
            }),
        ...options,
    });
}

export type RejectDatasetSquareDto = { reason?: string };

export function useApproveDatasetSquareMutation(
    options?: MutationOptionsUtil<ConsoleDatasetItem, string>,
) {
    return useMutation<ConsoleDatasetItem, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<ConsoleDatasetItem>(`/datasets/${id}/approve-square`),
        ...options,
    });
}

export function useRejectDatasetSquareMutation(
    options?: MutationOptionsUtil<ConsoleDatasetItem, { id: string; reason?: string }>,
) {
    return useMutation<ConsoleDatasetItem, Error, { id: string; reason?: string }>({
        mutationFn: ({ id, reason }) =>
            consoleHttpClient.post<ConsoleDatasetItem>(`/datasets/${id}/reject-square`, {
                reason,
            }),
        ...options,
    });
}

export function useConsoleDatasetDetailQuery(
    id: string | null,
    options?: QueryOptionsUtil<ConsoleDatasetVectorConfig>,
) {
    return useQuery({
        queryKey: ["console", "datasets", "detail", id],
        queryFn: () => consoleHttpClient.get<ConsoleDatasetVectorConfig>(`/datasets/${id}`),
        enabled: !!id,
        ...options,
    });
}

export function useSetDatasetVectorConfigMutation(
    options?: MutationOptionsUtil<
        ConsoleDatasetVectorConfig,
        { id: string; dto: SetDatasetVectorConfigDto }
    >,
) {
    return useMutation<
        ConsoleDatasetVectorConfig,
        Error,
        { id: string; dto: SetDatasetVectorConfigDto }
    >({
        mutationFn: ({ id, dto }) =>
            consoleHttpClient.patch<ConsoleDatasetVectorConfig>(`/datasets/${id}/vector-config`, dto),
        ...options,
    });
}
