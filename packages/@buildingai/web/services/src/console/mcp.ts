import type { McpCommunicationType, McpServerType } from "@buildingai/constants";
import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Types based on controller DTOs and entities
export type McpTool = {
    id: string;
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
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
    isDisabled: boolean;
    isQuickMenu: boolean;
    sortOrder: number;
    userId?: string;
    createdAt: string;
    updatedAt: string;
    tools?: McpTool[];
    toolsCount?: number;
};

export type CreateAiMcpServerDto = {
    name: string;
    alias?: string;
    description?: string;
    icon?: string;
    type?: McpServerType;
    communicationType?: McpCommunicationType;
    url: string;
    isDisabled?: boolean;
    isQuickMenu?: boolean;
    providerIcon?: string;
    providerName?: string;
    providerUrl?: string;
    sortOrder?: number;
    userId?: string;
    customHeaders?: Record<string, string>;
};

export type UpdateAiMcpServerDto = Partial<CreateAiMcpServerDto>;

export type QueryAiMcpServerDto = {
    page?: number;
    pageSize?: number;
    name?: string;
    isDisabled?: boolean;
    type?: McpServerType;
};

export type BatchDeleteAiMcpServerDto = {
    ids: string[];
};

export type McpServerUrlConfig = {
    url: string;
    customHeaders?: Record<string, string>;
};

export type ImportAiMcpServerDto = {
    mcpServers: Record<string, McpServerUrlConfig>;
    creatorId?: string;
};

export type ImportAiMcpServerJsonDto = {
    jsonString: string;
};

export type BatchCheckMcpConnectionDto = {
    mcpServerIds: string[];
};

export type BatchCheckConnectionResult = {
    mcpServerId: string;
    success: boolean;
    connectable: boolean;
    message: string;
    error?: string;
    tools?: McpTool[];
};

export type BatchCheckConnectionResponse = {
    summary: {
        total: number;
        success: number;
        failed: number;
        errors: number;
    };
    results: BatchCheckConnectionResult[];
    message: string;
};

export type ToggleActiveBody = {
    isDisabled: boolean;
};

export type ToggleActiveResponse = {
    message: string;
    server: McpServer;
};

// ============================================================
// MCP Server Query Operations
// ============================================================

/**
 * Get paginated list of MCP servers
 */
export function useMcpServersListQuery(
    params?: QueryAiMcpServerDto,
    options?: PaginatedQueryOptionsUtil<McpServer>,
) {
    return useQuery<PaginatedResponse<McpServer>, Error, PaginatedResponse<McpServer>>({
        queryKey: ["mcp-servers", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<McpServer>>("/ai-mcp-servers", { params }),
        ...options,
    });
}

/**
 * Get MCP server by ID
 */
export function useMcpServerQuery(id: string, options?: QueryOptionsUtil<McpServer>) {
    return useQuery<McpServer, Error, McpServer>({
        queryKey: ["mcp-servers", "detail", id],
        queryFn: () => consoleHttpClient.get<McpServer>(`/ai-mcp-servers/${id}`),
        enabled: !!id,
        ...options,
    });
}

/**
 * Get default quick menu MCP server
 */
export function useDefaultQuickMenuQuery(options?: QueryOptionsUtil<McpServer | null>) {
    return useQuery<McpServer | null, Error, McpServer | null>({
        queryKey: ["mcp-servers", "quick-menu"],
        queryFn: () => consoleHttpClient.get<McpServer | null>("/ai-mcp-servers/quick-menu"),
        ...options,
    });
}

// ============================================================
// MCP Server Mutation Operations
// ============================================================

/**
 * Create MCP server
 */
export function useCreateMcpServerMutation(
    options?: MutationOptionsUtil<McpServer, CreateAiMcpServerDto>,
) {
    return useMutation<McpServer, Error, CreateAiMcpServerDto>({
        mutationFn: (data) => consoleHttpClient.post<McpServer>("/ai-mcp-servers", data),
        ...options,
    });
}

/**
 * Update MCP server
 */
export function useUpdateMcpServerMutation(
    options?: MutationOptionsUtil<McpServer, { id: string; data: UpdateAiMcpServerDto }>,
) {
    return useMutation<McpServer, Error, { id: string; data: UpdateAiMcpServerDto }>({
        mutationFn: ({ id, data }) =>
            consoleHttpClient.put<McpServer>(`/ai-mcp-servers/${id}`, data),
        ...options,
    });
}

/**
 * Delete MCP server
 */
export function useDeleteMcpServerMutation(options?: MutationOptionsUtil<null, string>) {
    return useMutation<null, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<null>(`/ai-mcp-servers/${id}`),
        ...options,
    });
}

/**
 * Batch delete MCP servers
 */
export function useBatchDeleteMcpServersMutation(
    options?: MutationOptionsUtil<null, BatchDeleteAiMcpServerDto>,
) {
    return useMutation<null, Error, BatchDeleteAiMcpServerDto>({
        mutationFn: (data) => consoleHttpClient.post<null>("/ai-mcp-servers/batch-delete", data),
        ...options,
    });
}

/**
 * Toggle MCP server active status
 */
export function useToggleMcpServerActiveMutation(
    options?: MutationOptionsUtil<ToggleActiveResponse, { id: string; isDisabled: boolean }>,
) {
    return useMutation<ToggleActiveResponse, Error, { id: string; isDisabled: boolean }>({
        mutationFn: ({ id, isDisabled }) =>
            consoleHttpClient.put<ToggleActiveResponse>(`/ai-mcp-servers/${id}/toggle-active`, {
                isDisabled,
            }),
        ...options,
    });
}

/**
 * Set default quick menu
 */
export function useSetDefaultQuickMenuMutation(
    options?: MutationOptionsUtil<{ message: string }, string>,
) {
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<{ message: string }>(`/ai-mcp-servers/quick-menu/${id}`),
        ...options,
    });
}

/**
 * Check MCP server connection
 */
export function useCheckMcpConnectionMutation(
    options?: MutationOptionsUtil<
        { tools: McpTool[]; connectable: boolean; message: string },
        string
    >,
) {
    return useMutation<{ tools: McpTool[]; connectable: boolean; message: string }, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<{ tools: McpTool[]; connectable: boolean; message: string }>(
                `/ai-mcp-servers/${id}/check-connection`,
            ),
        ...options,
    });
}

/**
 * Batch check MCP servers connection
 */
export function useBatchCheckMcpConnectionMutation(
    options?: MutationOptionsUtil<BatchCheckConnectionResponse, BatchCheckMcpConnectionDto>,
) {
    return useMutation<BatchCheckConnectionResponse, Error, BatchCheckMcpConnectionDto>({
        mutationFn: (data) =>
            consoleHttpClient.post<BatchCheckConnectionResponse>(
                "/ai-mcp-servers/batch-check-connection",
                data,
            ),
        ...options,
    });
}

/**
 * Import MCP servers from JSON string
 */
export function useImportMcpServersFromJsonMutation(
    options?: MutationOptionsUtil<any, ImportAiMcpServerJsonDto>,
) {
    return useMutation<any, Error, ImportAiMcpServerJsonDto>({
        mutationFn: (data) =>
            consoleHttpClient.post<any>("/ai-mcp-servers/import-json-string", data),
        ...options,
    });
}
