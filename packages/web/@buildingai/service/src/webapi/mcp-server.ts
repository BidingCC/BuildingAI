/**
 * @fileoverview Web API service functions for MCP server management
 * @description This file contains API functions for MCP server CRUD operations,
 * server connection management, and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type {
    BaseCreateRequest,
    BaseEntity,
    BaseUpdateRequest,
    Pagination,
    PaginationResult,
} from "../models/globals";

// ==================== Type Definitions ====================

/**
 * MCP server type enumeration
 * @description Defines the types of MCP servers
 */
export enum McpServerType {
    USER = "user",
    SYSTEM = "system",
}

/**
 * MCP server query parameters interface
 * @description Interface for MCP server query parameters
 */
export interface McpServerQueryParams {
    name?: string;
    isDisabled?: boolean;
    type?: McpServerType;
}

/**
 * MCP server information interface
 * @description Interface for MCP server information with all server properties
 */
export interface McpServerInfo extends BaseEntity {
    mcpServerId: string;
    name: string;
    description: string;
    icon: string;
    type: "user" | "system";
    timeout: number;
    providerName: string;
    url: string;
    sortOrder: number;
    isDisabled: boolean;
    creatorId: string;
    proproviderIcon?: string;
    isShow?: boolean;
    isAssociated?: boolean;
    connectError: string;
    connectable: boolean;
    alias?: string;
    tools?: ToolsItem[];
    communicationType?: string;
    customHeaders?: Record<string, string> | string;
}

/**
 * System MCP server information interface
 * @description Interface for system MCP server information with association ID
 */
export interface SystemMcpServerInfo extends McpServerInfo {
    associationId: string;
}

/**
 * MCP server creation parameters interface
 * @description Interface for MCP server creation parameters
 */
export interface McpServerCreateParams {
    name: string;
    description: string;
    icon: string;
    providerName?: string;
    providerUrl?: string;
    url: string;
    timeout?: number;
    communicationType?: string;
    customHeaders?: Record<string, string> | string;
}

/**
 * MCP server creation request type
 * @description Excludes auto-generated fields from McpServerInfo
 */
export type McpServerCreateRequest = BaseCreateRequest<McpServerInfo>;

/**
 * MCP server update request type
 * @description Inherits from creation request and makes all fields optional
 */
export type McpServerUpdateRequest = BaseUpdateRequest<McpServerInfo>;

/**
 * MCP server response interface
 * @description Interface for MCP server list response with pagination
 */
export type McpServerResponse = PaginationResult<McpServerInfo | SystemMcpServerInfo>;

/**
 * System MCP server query parameters interface
 * @description Interface for system MCP server query parameters
 */
export interface SystemMcpServerCreateParams extends Pagination {
    name?: string;
    isAssociated?: boolean;
}

/**
 * Tool information interface
 * @description Interface for tool statistics information
 */
export interface ToolInfo {
    created: number;
    deleted: number;
    total: number;
    updated: number;
}

/**
 * Tools item type definition
 * @description Type definition for MCP server tools
 */
export interface ToolsItem extends BaseEntity {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    mcpServerId: string;
}

/**
 * MCP server connection check response interface
 * @description Interface for MCP server connection check response
 */
export interface CheckMcpServerConnectResponse {
    connectable: boolean;
    error?: string;
    message: string;
    success: boolean;
    toolsInfo?: ToolInfo[];
}

/**
 * Association interface
 * @description Interface for MCP server association information
 */
export interface Association {
    associationId: string;
    id: string;
    name: string;
    status: string;
}

/**
 * JSON import MCP server response interface
 * @description Interface for JSON import MCP server response
 */
export interface JsonImportMcpServerResponse {
    results: Association[];
    message: string;
    success: boolean;
    created: number;
    updated: number;
    total: number;
}

// ==================== MCP Server Query Related APIs ====================

/**
 * Get MCP server list
 * @description Retrieves MCP server list based on query conditions
 * @param params Query parameters
 * @returns Promise with MCP server list
 */
export function apiGetMcpServerList(params?: McpServerQueryParams): Promise<McpServerResponse> {
    return useWebGet("/ai-mcp-servers", params, { requireAuth: true });
}

/**
 * Get all MCP server list
 * @description Retrieves all MCP server list
 * @returns Promise with all MCP server list
 */
export function apiGetAllMcpServerList(): Promise<McpServerInfo[] | SystemMcpServerInfo[]> {
    return useWebGet("/ai-mcp-servers/all", {}, { requireAuth: true });
}

/**
 * Get MCP server details
 * @description Retrieves MCP server details by server ID
 * @param id MCP server ID
 * @returns Promise with MCP server details
 */
export function apiGetMcpServerDetail(id: string): Promise<McpServerInfo> {
    return useWebGet(`/ai-mcp-servers/${id}`);
}

// ==================== MCP Server Management Related APIs ====================

/**
 * Create MCP server
 * @description Creates a new MCP server configuration
 * @param data MCP server creation data
 * @returns Promise with created MCP server information
 */
export function apiCreateMcpServer(
    data:
        | McpServerCreateParams
        | (Omit<McpServerCreateParams, "args"> & { args?: Record<string, unknown> }),
): Promise<McpServerInfo> {
    return useWebPost("/ai-mcp-servers", data);
}

/**
 * Update MCP server
 * @description Updates MCP server configuration by server ID
 * @param id MCP server ID
 * @param data Update data
 * @returns Promise with update result
 */
export function apiUpdateMcpServer(
    id: string,
    data:
        | McpServerCreateParams
        | (Omit<McpServerCreateParams, "args"> & { args?: Record<string, unknown> }),
): Promise<McpServerInfo> {
    return useWebPut(`/ai-mcp-servers/${id}`, data);
}

/**
 * Delete MCP server
 * @description Deletes MCP server configuration by server ID
 * @param id MCP server ID
 * @returns Promise with deletion result
 */
export function apiDeleteMcpServer(id: string): Promise<void> {
    return useWebDelete(`/ai-mcp-servers/${id}`);
}

// ==================== System MCP Server Related APIs ====================

/**
 * Get system MCP server list
 * @description Retrieves system MCP server list
 * @param params Query parameters
 * @returns Promise with system MCP server list
 */
export function apiGetSystemMcpServerList(
    params?: SystemMcpServerCreateParams,
): Promise<McpServerResponse> {
    return useWebGet("/ai-mcp-servers/system-mcp", params);
}

/**
 * Add system MCP server
 * @description Adds a system MCP server to user's servers
 * @param mcpServerId MCP server ID
 * @returns Promise with addition result
 */
export function apiAddSystemMcpServer(mcpServerId: string): Promise<{ message: string }> {
    return useWebPost("/ai-mcp-servers/user-servers", { mcpServerId });
}

/**
 * Remove system MCP server
 * @description Removes a system MCP server from user's servers
 * @param id MCP server ID
 * @returns Promise with removal result
 */
export function apiRemoveSystemMcpServer(id: string): Promise<{ message: string }> {
    return useWebDelete(`/ai-mcp-servers/${id}`);
}

// ==================== MCP Server Status and Connection Related APIs ====================

/**
 * Update MCP server visibility
 * @description Updates MCP server visibility status by server ID
 * @param id MCP server ID
 * @param data Update data with status
 * @returns Promise with update result
 */
export function apiUpdateMcpServerVisible(
    id: string,
    data: { status: boolean },
): Promise<McpServerInfo> {
    return useWebPut(`/ai-mcp-servers/${id}/toggle-disabled`, data);
}

/**
 * Get system MCP server details
 * @description Retrieves system MCP server details
 * @param id System MCP server ID
 * @returns Promise with system MCP server details
 */
export function apiGetSystemMcpServerDetail(id: string): Promise<SystemMcpServerInfo> {
    return useWebGet(`/ai-mcp-servers/system-mcp/${id}`);
}

/**
 * Check MCP server connectivity
 * @description Checks MCP server connectivity
 * @param id MCP server ID
 * @returns Promise with connectivity check result
 */
export function apiCheckMcpServerConnect(id: string): Promise<CheckMcpServerConnectResponse> {
    return useWebPost(`/ai-mcp-servers/${id}/check-connection`);
}

/**
 * Import MCP servers from JSON
 * @description Imports MCP servers from JSON string
 * @param jsonString JSON string containing MCP server data
 * @returns Promise with import result
 */
export function apiJsonImportMcpServers(jsonString: string): Promise<JsonImportMcpServerResponse> {
    return useWebPost("/ai-mcp-servers/import-json-string", { jsonString });
}

/**
 * Batch check MCP server connectivity
 * @description Batch checks MCP server connectivity for multiple servers
 * @param mcpServerIds Array of MCP server IDs
 * @returns Promise with batch check result
 */
export function apiBatchCheckMcpServerConnect(mcpServerIds: string[]): Promise<void> {
    return useWebPost("/ai-mcp-servers/batch-check-connection", { mcpServerIds });
}
