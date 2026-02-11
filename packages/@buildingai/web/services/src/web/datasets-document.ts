import { useAuthStore } from "@buildingai/stores";
import type {
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import type {
    InfiniteData,
    UseInfiniteQueryResult,
    UseMutationResult,
    UseQueryResult,
} from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type CreateDocumentParams = {
    fileId?: string;
    url?: string;
};

export type DocumentSortBy = "name" | "size" | "uploadTime";

export type DocumentFileTypeFilter = "all" | "text" | "table" | "image";

export type ListDocumentsParams = {
    page?: number;
    pageSize?: number;
    sortBy?: DocumentSortBy;
    fileType?: DocumentFileTypeFilter;
    keyword?: string;
};

export type DatasetsDocument = {
    id: string;
    datasetId: string;
    fileId: string | null;
    fileUrl: string | null;
    fileName: string;
    fileType: string;
    fileSize: number;
    summary: string | null;
    summaryGenerating?: boolean;
    tags: string[] | null;
    chunkCount: number;
    characterCount: number;
    status: string;
    progress: number;
    error: string | null;
    embeddingModelId?: string;
    enabled: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};

export async function createDatasetsDocument(
    datasetId: string,
    params: CreateDocumentParams,
): Promise<DatasetsDocument> {
    return apiHttpClient.post<DatasetsDocument>(`/ai-datasets/${datasetId}/documents`, params);
}

export async function listDatasetsDocuments(
    datasetId: string,
    params?: ListDocumentsParams,
): Promise<PaginatedResponse<DatasetsDocument>> {
    const { page, pageSize, sortBy, fileType, keyword } = {
        page: 1,
        pageSize: 20,
        sortBy: "uploadTime" as DocumentSortBy,
        fileType: "all" as DocumentFileTypeFilter,
        ...params,
    };
    const queryParams = {
        page,
        pageSize,
        sortBy,
        ...(fileType && fileType !== "all" && { fileType }),
        ...(keyword?.trim() && { keyword: keyword.trim() }),
    };
    return apiHttpClient.get<PaginatedResponse<DatasetsDocument>>(
        `/ai-datasets/${datasetId}/documents`,
        { params: queryParams },
    );
}

export async function getDatasetsDocument(
    datasetId: string,
    documentId: string,
): Promise<DatasetsDocument> {
    return apiHttpClient.get<DatasetsDocument>(`/ai-datasets/${datasetId}/documents/${documentId}`);
}

export async function deleteDatasetsDocument(
    datasetId: string,
    documentId: string,
): Promise<{ success: boolean }> {
    return apiHttpClient.delete<{ success: boolean }>(
        `/ai-datasets/${datasetId}/documents/${documentId}`,
    );
}

export type BatchDeleteDocumentsParams = {
    documentIds: string[];
};

export type BatchDeleteDocumentsResult = {
    deleted: number;
};

export async function batchDeleteDatasetsDocuments(
    datasetId: string,
    params: BatchDeleteDocumentsParams,
): Promise<BatchDeleteDocumentsResult> {
    return apiHttpClient.post<BatchDeleteDocumentsResult>(
        `/ai-datasets/${datasetId}/documents/batch-delete`,
        params,
    );
}

export async function retryDocumentVectorization(
    datasetId: string,
    documentId: string,
): Promise<{ success: boolean }> {
    return apiHttpClient.post<{ success: boolean }>(
        `/ai-datasets/${datasetId}/documents/${documentId}/retry-vectorization`,
    );
}

export type BatchAddTagsParams = {
    documentIds: string[];
    tags: string[];
};

export type BatchAddTagsResult = {
    updated: number;
};

export async function batchAddTagsDatasetsDocuments(
    datasetId: string,
    params: BatchAddTagsParams,
): Promise<BatchAddTagsResult> {
    return apiHttpClient.post<BatchAddTagsResult>(
        `/ai-datasets/${datasetId}/documents/batch-add-tags`,
        params,
    );
}

export type BatchMoveDocumentsParams = {
    documentIds: string[];
    targetDatasetId: string;
};

export type BatchMoveDocumentsResult = {
    moved: number;
};

export async function batchMoveDatasetsDocuments(
    datasetId: string,
    params: BatchMoveDocumentsParams,
): Promise<BatchMoveDocumentsResult> {
    return apiHttpClient.post<BatchMoveDocumentsResult>(
        `/ai-datasets/${datasetId}/documents/batch-move`,
        params,
    );
}

export type BatchCopyDocumentsParams = {
    documentIds: string[];
    targetDatasetId: string;
};

export type BatchCopyDocumentsResult = {
    copied: number;
};

export async function batchCopyDatasetsDocuments(
    datasetId: string,
    params: BatchCopyDocumentsParams,
): Promise<BatchCopyDocumentsResult> {
    return apiHttpClient.post<BatchCopyDocumentsResult>(
        `/ai-datasets/${datasetId}/documents/batch-copy`,
        params,
    );
}

export type UpdateDocumentTagsParams = {
    tags: string[];
};

export async function updateDocumentTags(
    datasetId: string,
    documentId: string,
    params: UpdateDocumentTagsParams,
): Promise<DatasetsDocument> {
    return apiHttpClient.patch<DatasetsDocument>(
        `/ai-datasets/${datasetId}/documents/${documentId}/tags`,
        params,
    );
}

export function useDatasetsDocumentsQuery(
    datasetId: string,
    params?: ListDocumentsParams,
    options?: PaginatedQueryOptionsUtil<DatasetsDocument>,
): UseQueryResult<PaginatedResponse<DatasetsDocument>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<PaginatedResponse<DatasetsDocument>>({
        queryKey: ["datasets", datasetId, "documents", params],
        queryFn: () => listDatasetsDocuments(datasetId, params),
        enabled: !!datasetId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

const DOCUMENTS_INFINITE_LIST_KEY = ["datasets", "documents-infinite"] as const;

function hasPollingDocument(
    data: InfiniteData<PaginatedResponse<DatasetsDocument>> | undefined,
): boolean {
    const items = data?.pages.flatMap((p) => p.items) ?? [];
    return items.some(
        (d) => d.status === "pending" || d.status === "processing" || d.summaryGenerating,
    );
}

export function useDatasetsDocumentsInfiniteQuery(
    datasetId: string,
    params: {
        pageSize?: number;
        sortBy?: DocumentSortBy;
        fileType?: DocumentFileTypeFilter;
        keyword?: string;
    },
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<DatasetsDocument>>, unknown> {
    const { pageSize = 20, sortBy = "uploadTime", fileType = "all", keyword } = params;
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useInfiniteQuery<PaginatedResponse<DatasetsDocument>>({
        queryKey: [
            ...DOCUMENTS_INFINITE_LIST_KEY,
            datasetId,
            pageSize,
            sortBy,
            fileType,
            keyword ?? "",
        ],
        queryFn: ({ pageParam }) =>
            listDatasetsDocuments(datasetId, {
                page: pageParam as number,
                pageSize,
                sortBy,
                fileType,
                keyword: keyword?.trim() || undefined,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: !!datasetId && isLogin() && options?.enabled !== false,
        refetchInterval: (query) =>
            hasPollingDocument(
                query.state.data as InfiniteData<PaginatedResponse<DatasetsDocument>> | undefined,
            )
                ? 2000
                : false,
        ...options,
    });
}

export function useDatasetsDocumentQuery(
    datasetId: string,
    documentId: string,
    options?: QueryOptionsUtil<DatasetsDocument>,
): UseQueryResult<DatasetsDocument, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<DatasetsDocument>({
        queryKey: ["datasets", datasetId, "document", documentId],
        queryFn: () => getDatasetsDocument(datasetId, documentId),
        enabled: !!datasetId && !!documentId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

function invalidateDatasetDocuments(queryClient: ReturnType<typeof useQueryClient>, id: string) {
    queryClient.invalidateQueries({ queryKey: ["datasets", id, "documents"] });
    queryClient.invalidateQueries({ queryKey: [...DOCUMENTS_INFINITE_LIST_KEY, id] });
}

export function useCreateDatasetsDocument(
    datasetId: string,
): UseMutationResult<DatasetsDocument, unknown, CreateDocumentParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params) => createDatasetsDocument(datasetId, params),
        onSuccess: () => invalidateDatasetDocuments(queryClient, datasetId),
    });
}

export function useDeleteDatasetsDocument(
    datasetId: string,
): UseMutationResult<{ success: boolean }, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (documentId: string) => deleteDatasetsDocument(datasetId, documentId),
        onSuccess: () => invalidateDatasetDocuments(queryClient, datasetId),
    });
}

export function useBatchDeleteDatasetsDocuments(
    datasetId: string,
): UseMutationResult<BatchDeleteDocumentsResult, unknown, string[], unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (documentIds: string[]) =>
            batchDeleteDatasetsDocuments(datasetId, { documentIds }),
        onSuccess: () => invalidateDatasetDocuments(queryClient, datasetId),
    });
}

export function useRetryDocumentVectorization(
    datasetId: string,
): UseMutationResult<{ success: boolean }, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (documentId: string) => retryDocumentVectorization(datasetId, documentId),
        onSuccess: (_, documentId) => {
            invalidateDatasetDocuments(queryClient, datasetId);
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "document", documentId],
            });
        },
    });
}

export function useBatchAddTagsDatasetsDocuments(
    datasetId: string,
): UseMutationResult<BatchAddTagsResult, unknown, BatchAddTagsParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: BatchAddTagsParams) =>
            batchAddTagsDatasetsDocuments(datasetId, params),
        onSuccess: () => invalidateDatasetDocuments(queryClient, datasetId),
    });
}

export function useBatchMoveDatasetsDocuments(
    datasetId: string,
): UseMutationResult<BatchMoveDocumentsResult, unknown, BatchMoveDocumentsParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: BatchMoveDocumentsParams) =>
            batchMoveDatasetsDocuments(datasetId, params),
        onSuccess: (_, params) => {
            invalidateDatasetDocuments(queryClient, datasetId);
            invalidateDatasetDocuments(queryClient, params.targetDatasetId);
        },
    });
}

export function useBatchCopyDatasetsDocuments(
    datasetId: string,
): UseMutationResult<BatchCopyDocumentsResult, unknown, BatchCopyDocumentsParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: BatchCopyDocumentsParams) =>
            batchCopyDatasetsDocuments(datasetId, params),
        onSuccess: (_, params) => {
            invalidateDatasetDocuments(queryClient, datasetId);
            invalidateDatasetDocuments(queryClient, params.targetDatasetId);
        },
    });
}

export function useUpdateDocumentTags(
    datasetId: string,
): UseMutationResult<DatasetsDocument, unknown, { documentId: string; tags: string[] }, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ documentId, tags }: { documentId: string; tags: string[] }) =>
            updateDocumentTags(datasetId, documentId, { tags }),
        onSuccess: (_, { documentId }) => {
            invalidateDatasetDocuments(queryClient, datasetId);
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "document", documentId],
            });
        },
    });
}
