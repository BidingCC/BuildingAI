import type { PaginatedResponse } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConsoleListDocumentsParams = {
    page?: number;
    pageSize?: number;
    sortBy?: "name" | "size" | "uploadTime";
    keyword?: string;
};

export type ConsoleDatasetsDocument = {
    id: string;
    datasetId: string;
    fileName: string;
    fileType?: string;
    fileSize: number;
    status: string;
    progress: number;
    chunkCount: number;
    createdAt: string;
    [key: string]: unknown;
};

export function useConsoleDatasetDocumentsQuery(
    datasetId: string | null,
    params?: ConsoleListDocumentsParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["console", "datasets-documents", datasetId, "documents", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<ConsoleDatasetsDocument>>(
                `/datasets-documents/${datasetId}/documents`,
                { params: params ?? {} },
            ),
        enabled: !!datasetId && options?.enabled !== false,
        ...options,
    });
}
