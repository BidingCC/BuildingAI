/**
 * @fileoverview MCP server management related type definitions
 * @description Defines data structures and request parameter interfaces related to MCP server management
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity } from "../models/globals";
import type { UserInfo } from "../webapi/user";

// Re-export McpToolCall from @buildingai/types to avoid circular dependencies
export type { McpToolCall } from "@buildingai/types";

// ==================== Base Type Definitions ====================

/**
 * Base MCP server configuration interface
 * @description Common fields shared across all MCP server interfaces
 */
export interface BaseMcpServerConfig {
    /** Server name */
    name: string;
    /** Server description */
    description: string;
    /** Server icon */
    icon: string;
    /** Server type */
    type: string;
    /** Communication type */
    communicationType: string;
    /** Environment variables */
    env: Record<string, unknown>;
    /** Server arguments */
    args: Record<string, unknown>;
    /** Provider name */
    providerName: string;
    /** Provider URL */
    providerUrl: string;
    /** Sort order */
    sortOrder: number;
    /** User ID */
    userId: string;
}

/**
 * MCP server status interface
 * @description Server status and visibility settings
 */
export interface McpServerStatus {
    /** Whether server is active */
    isActive: boolean;
    /** Whether server is public */
    isPublic: boolean;
    /** Whether server is disabled */
    isDisabled?: boolean;
}

/**
 * MCP server connection interface
 * @description Server connection related fields
 */
export interface McpServerConnection {
    /** Server URL */
    url: string;
    /** Connection timeout */
    timeout: number;
    /** Whether server is connectable */
    connectable?: boolean;
    /** Connection error message */
    connectError?: string;
}

/**
 * MCP server UI interface
 * @description UI related fields for server display
 */
export interface McpServerUI {
    /** Whether in quick menu */
    isQuickMenu?: boolean;
    /** Server alias */
    alias?: string;
}

// ==================== Main Type Definitions ====================

/**
 * MCP tool call record interface - DEPRECATED
 * @deprecated Use McpToolCall from @buildingai/http instead
 * @description This interface is now defined in @buildingai/http to avoid circular dependencies.
 * The original definition is kept here for reference but is no longer exported.
 *
 * Original definition:
 * - id?: string
 * - mcpServer?: McpServerInfo
 * - tool?: Omit<McpServerTool, "id" | "createdAt" | "updatedAt" | "mcpServerId">
 * - input?: Record<string, any>
 * - output?: Record<string, any>
 * - timestamp?: number
 * - status?: "success" | "error"
 * - error?: string
 * - duration?: number
 */

/**
 * MCP server list interface
 * @description Interface for MCP server information in list view
 */
export interface McpServerInfo extends BaseEntity, BaseMcpServerConfig, McpServerStatus {
    /** User information */
    user: UserInfo;
}

/**
 * MCP server query parameters interface
 * @description Interface for MCP server query parameters
 */
export interface McpServerQueryParams {
    /** Server status */
    isActive?: boolean;
    /** Server name */
    name?: string;
    /** Server type */
    type?: string;
    /** User ID */
    userId?: string;
    /** Additional properties */
    [property: string]: any;
}

/**
 * MCP server detail interface
 * @description Interface for detailed MCP server information
 */
export interface McpServerDetail
    extends BaseEntity,
        BaseMcpServerConfig,
        McpServerStatus,
        McpServerConnection,
        McpServerUI {
    /** User information */
    user: UserInfo;
    /** Available tools */
    tools: McpServerTool[];
}

/**
 * MCP server tool interface
 * @description Interface for MCP server tool information
 */
export interface McpServerTool extends BaseEntity {
    /** Tool name */
    name: string;
    /** Tool description */
    description: string;
    /** MCP server ID */
    mcpServerId: string;
}

/**
 * Create MCP server request parameters
 * @description Interface for creating MCP server request
 */
export interface CreateMcpServerRequest
    extends Partial<BaseMcpServerConfig>,
        Partial<McpServerConnection>,
        Partial<McpServerUI> {
    /** JSON import string */
    jsonImport?: string;
    /** Available tools */
    tools?: McpServerTool[];
    /** Custom headers */
    customHeaders?: string | Record<string, string>;
    /** Whether server is disabled (required for creation) */
    isDisabled: boolean;
}

/**
 * Tool information interface
 * @description Interface for tool statistics information
 */
export interface ToolInfo {
    /** Number of created tools */
    created: number;
    /** Number of deleted tools */
    deleted: number;
    /** Total number of tools */
    total: number;
    /** Number of updated tools */
    updated: number;
}

/**
 * Check MCP server connection response interface
 * @description Interface for MCP server connection check response
 */
export interface CheckMcpServerConnectResponse {
    /** Whether server is connectable */
    connectable: boolean;
    /** Error message if connection failed */
    error?: string;
    /** Response message */
    message: string;
    /** Whether operation was successful */
    success: boolean;
    /** Tool information */
    toolsInfo?: ToolInfo[];
}

/**
 * Import results interface
 * @description Interface for import operation results
 */
export interface results {
    /** Result ID */
    id: string;
    /** Result name */
    name: string;
}

/**
 * JSON import MCP server response interface
 * @description Interface for JSON import MCP server response
 */
export interface JsonImportMcpServerResponse {
    /** Import results */
    results: results[];
    /** Response message */
    message: string;
    /** Whether operation was successful */
    success: boolean;
    /** Number of created servers */
    created: number;
    /** Number of updated servers */
    updated: number;
    /** Total number of servers */
    total: number;
}

/**
 * Update MCP server request interface
 * @description Interface for updating MCP server request
 */
export type UpdateMcpServerRequest = Partial<CreateMcpServerRequest>;

// ==================== MCP Server Query Related APIs ====================

/**
 * Get MCP server list
 * @description Get MCP server list based on query conditions
 * @param params Query parameters
 * @returns Promise with MCP server list
 */
export function apiGetMcpServerList(params?: McpServerQueryParams): Promise<McpServerInfo[]> {
    return useConsoleGet("/ai-mcp-servers", params);
}

/**
 * Get MCP server detail
 * @description Get detailed MCP server information by server ID
 * @param id MCP server ID
 * @returns Promise with MCP server detail information
 */
export function apiGetMcpServerDetail(id: string): Promise<McpServerDetail> {
    return useConsoleGet(`/ai-mcp-servers/${id}`);
}

// ==================== MCP Server Management Related APIs ====================

/**
 * Create MCP server
 * @description Create new MCP server configuration
 * @param data MCP server creation data
 * @returns Promise with created MCP server information
 */
export function apiCreateMcpServer(
    data:
        | CreateMcpServerRequest
        | (Omit<CreateMcpServerRequest, "args"> & { args?: Record<string, unknown> }),
): Promise<McpServerInfo> {
    return useConsolePost("/ai-mcp-servers", data);
}

/**
 * Delete MCP server
 * @description Delete specified MCP server configuration by server ID
 * @param id MCP server ID
 * @returns Promise with deletion result
 */
export function apiDeleteMcpServer(id: string): Promise<void> {
    return useConsoleDelete(`/ai-mcp-servers/${id}`);
}

/**
 * Batch delete MCP servers
 * @description Batch delete multiple MCP servers by server ID array
 * @param ids Array of MCP server IDs
 * @returns Promise with deletion result
 */
export function apiBatchDeleteMcpServers(ids: string[]): Promise<void> {
    return useConsolePost("/ai-mcp-servers/batch-delete", { ids });
}

/**
 * Update MCP server
 * @description Update MCP server configuration information by server ID
 * @param id MCP server ID
 * @param data Update data
 * @returns Promise with updated MCP server information
 */
export function apiUpdateMcpServer(
    id: string,
    data:
        | UpdateMcpServerRequest
        | (Omit<CreateMcpServerRequest, "args"> & { args?: Record<string, unknown> }),
): Promise<McpServerInfo> {
    return useConsolePut(`/ai-mcp-servers/${id}`, data);
}

/**
 * JSON import MCP servers
 * @description Import MCP servers from JSON string
 * @param jsonString JSON string containing server configurations
 * @returns Promise with import results
 */
export function apiJsonImportMcpServers(jsonString: string): Promise<JsonImportMcpServerResponse> {
    return useConsolePost("/ai-mcp-servers/import-json-string", { jsonString });
}

/**
 * Check MCP server connectivity
 * @description Check MCP server connectivity by server ID
 * @param id MCP server ID
 * @returns Promise with connectivity check results
 */
export function apiCheckMcpServerConnect(id: string): Promise<CheckMcpServerConnectResponse> {
    return useConsolePost(`/ai-mcp-servers/${id}/check-connection`);
}

/**
 * Set quick menu
 * @description Set quick menu for MCP server by server ID
 * @param id MCP server ID
 * @returns Promise with operation result
 */
export function apiSetQuickMenu(id: string): Promise<void> {
    return useConsolePost(`/ai-mcp-servers/quick-menu/${id}`);
}

/**
 * Batch check MCP server connectivity
 * @description Batch check MCP server connectivity by server ID array
 * @param mcpServerIds Array of MCP server IDs
 * @returns Promise with batch check results
 */
export function apiBatchCheckMcpServerConnect(mcpServerIds: string[]): Promise<void> {
    return useConsolePost("/ai-mcp-servers/batch-check-connection", { mcpServerIds });
}
