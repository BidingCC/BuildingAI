import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

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
