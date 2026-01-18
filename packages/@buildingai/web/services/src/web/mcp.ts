import type {
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type McpServerType = "user" | "system";

export type McpCommunicationType = "sse" | "streamable-http";

export type McpTool = {
    id: string;
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    mcpServerId: string;
    createdAt: string;
    updatedAt: string;
};

export type McpServer = {
    id: string;
    name: string;
    alias?: string;
    description?: string;
    icon?: string;
    type: McpServerType;
    url: string | null;
    communicationType: McpCommunicationType;
    customHeaders?: Record<string, string>;
    providerIcon?: string;
    providerName?: string;
    providerUrl?: string;
    sortOrder: number;
    connectable: boolean;
    connectError: string;
    isDisabled: boolean;
    creatorId?: string;
    tools?: McpTool[];
    createdAt: string;
    updatedAt: string;
};

export type QueryMcpServersParams = {
    page?: number;
    pageSize?: number;
    name?: string;
    isDisabled?: boolean;
    type?: McpServerType;
};

export type CreateMcpServerParams = {
    name: string;
    alias?: string;
    description?: string;
    icon?: string;
    url: string;
    communicationType?: McpCommunicationType;
    customHeaders?: Record<string, string>;
    providerName?: string;
    providerUrl?: string;
    isDisabled?: boolean;
    env?: Record<string, string>;
};

export type UpdateMcpServerParams = Partial<CreateMcpServerParams>;

export type ToggleMcpServerStatusParams = {
    status: boolean;
};

export type ImportMcpServerJsonParams = {
    jsonString: string;
};

export type BatchCheckMcpConnectionParams = {
    mcpServerIds: string[];
};

export type CheckConnectionResponse = {
    success: boolean;
    connectable: boolean;
    message: string;
    error?: string;
};

export type BatchCheckConnectionResponse = {
    summary: {
        total: number;
        success: number;
        failed: number;
        errors: number;
    };
    results: Array<{
        mcpServerId: string;
        success: boolean;
        connectable: boolean;
        message: string;
        error?: string;
    }>;
    message: string;
};

export function useMcpServersQuery(
    params: QueryMcpServersParams,
    options?: PaginatedQueryOptionsUtil<McpServer>,
): UseQueryResult<PaginatedResponse<McpServer>, unknown> {
    return useQuery<PaginatedResponse<McpServer>>({
        queryKey: ["mcp-servers", params],
        queryFn: () =>
            apiHttpClient.get<PaginatedResponse<McpServer>>("/ai-mcp-servers", {
                params,
            }),
        ...options,
    });
}

export function useMcpServersAllQuery(
    options?: QueryOptionsUtil<McpServer[]>,
): UseQueryResult<McpServer[], unknown> {
    return useQuery<McpServer[]>({
        queryKey: ["mcp-servers", "all"],
        queryFn: () => apiHttpClient.get<McpServer[]>("/ai-mcp-servers/all"),
        ...options,
    });
}

export function useMcpServerQuickMenuQuery(
    options?: QueryOptionsUtil<McpServer | null>,
): UseQueryResult<McpServer | null, unknown> {
    return useQuery<McpServer | null>({
        queryKey: ["mcp-servers", "quick-menu"],
        queryFn: () => apiHttpClient.get<McpServer | null>("/ai-mcp-servers/quick-menu"),
        ...options,
    });
}

export function useMcpServerQuery(
    id: string,
    options?: QueryOptionsUtil<McpServer>,
): UseQueryResult<McpServer, unknown> {
    return useQuery<McpServer>({
        queryKey: ["mcp-server", id],
        queryFn: () => apiHttpClient.get<McpServer>(`/ai-mcp-servers/${id}`),
        enabled: !!id,
        ...options,
    });
}

export function useCreateMcpServer(): UseMutationResult<
    McpServer,
    unknown,
    CreateMcpServerParams,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: CreateMcpServerParams) =>
            apiHttpClient.post<McpServer>("/ai-mcp-servers", params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
        },
    });
}

export function useUpdateMcpServer(): UseMutationResult<
    McpServer,
    unknown,
    { id: string } & UpdateMcpServerParams,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...params }: { id: string } & UpdateMcpServerParams) =>
            apiHttpClient.put<McpServer>(`/ai-mcp-servers/${id}`, params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
            queryClient.invalidateQueries({ queryKey: ["mcp-server", variables.id] });
        },
    });
}

export function useDeleteMcpServer(): UseMutationResult<unknown, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiHttpClient.delete(`/ai-mcp-servers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
        },
    });
}

export function useToggleMcpServerStatus(): UseMutationResult<
    McpServer,
    unknown,
    { id: string } & ToggleMcpServerStatusParams,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string } & ToggleMcpServerStatusParams) =>
            apiHttpClient.put<McpServer>(`/ai-mcp-servers/${id}/toggle-disabled`, {
                status,
            }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
            queryClient.invalidateQueries({ queryKey: ["mcp-server", variables.id] });
        },
    });
}

export function useImportMcpServerJson(): UseMutationResult<
    McpServer[],
    unknown,
    ImportMcpServerJsonParams,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: ImportMcpServerJsonParams) =>
            apiHttpClient.post<McpServer[]>("/ai-mcp-servers/import-json-string", params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
        },
    });
}

export function useCheckMcpServerConnection(): UseMutationResult<
    CheckConnectionResponse & { id: string },
    unknown,
    string,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            apiHttpClient.post<CheckConnectionResponse & { id: string }>(
                `/ai-mcp-servers/${id}/check-connection`,
            ),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
            queryClient.invalidateQueries({ queryKey: ["mcp-server", id] });
        },
    });
}

export function useBatchCheckMcpConnection(): UseMutationResult<
    BatchCheckConnectionResponse,
    unknown,
    BatchCheckMcpConnectionParams,
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: BatchCheckMcpConnectionParams) =>
            apiHttpClient.post<BatchCheckConnectionResponse>(
                "/ai-mcp-servers/batch-check-connection",
                params,
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
        },
    });
}
