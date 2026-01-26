/**
 * @fileoverview Console API service functions for page decoration and layout management
 * @description This file contains API functions for layout configuration,
 * micro page management, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseCreateRequest, BaseEntity, BaseUpdateRequest } from "../models/globals";
import type { LayoutData } from "../webapi/decorate";

// ==================== Type Definitions ====================

/**
 * Terminal type definition
 * @description Defines the types of terminals for micro pages
 */
export type TerminalType = "web" | "mobile";

/**
 * Micro page form data interface
 * @description Interface for micro page form data based on backend actual fields
 */
export interface MicropageFormData extends BaseEntity {
    /** Page name */
    name: string;
    /** Terminal type */
    terminal: TerminalType;
    /** Page content configuration */
    content: any;
    /** Page configuration */
    configs: Record<string, any>;
}

/**
 * Micro page query request parameters interface
 * @description Interface for micro page query request parameters
 */
export interface MicropageQueryRequest {
    /** Page name (fuzzy search) */
    name?: string;
    /** Terminal type */
    terminal?: TerminalType;
}

/**
 * Micro page creation request type
 * @description Excludes auto-generated fields from MicropageFormData
 */
export type MicropageCreateRequest = BaseCreateRequest<MicropageFormData>;

/**
 * Micro page update request type
 * @description Inherits from creation request and makes all fields optional
 */
export type MicropageUpdateRequest = BaseUpdateRequest<MicropageFormData>;

/**
 * Plugin link information interface
 * @description Interface for plugin link data structure
 */
export interface PluginLinkInfo {
    /** Plugin name */
    pluginName: string;
    /** Link display name */
    linkName: string;
    /** Link path */
    linkPath: string;
    /** File path relative to extensions directory */
    filePath: string;
    /** Full file path */
    fullPath: string;
}

/**
 * Plugin links response interface
 * @description Interface for plugin links API response
 */
export interface PluginLinksResponse {
    /** Plugin links data */
    data: PluginLinkInfo[];
    /** Total count of links */
    total: number;
    /** Response timestamp */
    timestamp: string;
    /** Error message if any */
    error?: string;
}

/**
 * Pages configuration interface
 * @description Interface for pages configuration data
 */
export interface PagesConfig {
    /** Configuration data, structure defined by frontend */
    [key: string]: any;
}

/**
 * Pages configuration response interface
 * @description Interface for pages configuration API response
 */
export interface PagesConfigResponse extends PagesConfig {}

// ==================== Layout Configuration Related APIs ====================

/**
 * Get layout configuration by type
 * @description Retrieves layout configuration based on layout type
 * @param type Layout type (e.g., web)
 * @returns Promise with layout configuration
 */
export function apiGetLayoutConfig(type: string): Promise<LayoutData> {
    return useConsoleGet(`/decorate-page/layout/${type}`);
}

/**
 * Save layout configuration
 * @description Saves layout configuration data
 * @param type Layout type (e.g., web)
 * @param data Layout configuration data
 * @returns Promise with save result
 */
export function apiSaveLayoutConfig(type: string, data: any): Promise<LayoutData> {
    return useConsolePost(`/decorate-page/layout/${type}`, data);
}

// ==================== Micro Page Management Related APIs ====================

/**
 * Get micro page list
 * @description Retrieves list of micro pages based on query parameters
 * @param params Query parameters
 * @returns Promise with micro page list
 */
export function apiGetMicropageList(params?: MicropageQueryRequest): Promise<MicropageFormData[]> {
    return useConsoleGet("/decorate-micropage", params);
}

/**
 * Get micro page details
 * @description Retrieves detailed information for a specific micro page
 * @param id Micro page ID
 * @returns Promise with micro page details
 */
export function apiGetMicropageDetail(id: string): Promise<MicropageFormData> {
    return useConsoleGet(`/decorate-micropage/${id}`);
}

/**
 * Create micro page
 * @description Creates a new micro page
 * @param data Creation data
 * @returns Promise with creation result
 */
export function apiCreateMicropage(data: MicropageCreateRequest): Promise<MicropageFormData> {
    return useConsolePost("/decorate-micropage", data);
}

/**
 * Update micro page
 * @description Updates an existing micro page
 * @param id Micro page ID
 * @param data Update data
 * @returns Promise with update result
 */
export function apiUpdateMicropage(
    id: string,
    data: MicropageUpdateRequest,
): Promise<MicropageFormData> {
    return useConsolePatch(`/decorate-micropage/${id}`, data);
}

/**
 * Set micro page as home page
 * @description Sets a micro page as the home page
 * @param id Micro page ID
 * @returns Promise with operation result
 */
export function apiSetMicropageHome(id: string): Promise<{
    message: string;
    success: boolean;
}> {
    return useConsolePatch(`/decorate-micropage/home/${id}`, {});
}

/**
 * Delete micro page
 * @description Deletes a specific micro page
 * @param id Micro page ID
 * @returns Promise with deletion result
 */
export function apiDeleteMicropage(id: string): Promise<{
    message: string;
    success: boolean;
}> {
    return useConsoleDelete(`/decorate-micropage/${id}`);
}

/**
 * Batch delete micro pages
 * @description Deletes multiple micro pages at once
 * @param params Batch deletion parameters
 * @returns Promise with deletion result
 */
export function apiBatchDeleteMicropage(params: { ids: string[] }): Promise<{
    message: string;
    success: boolean;
}> {
    return useConsolePost("/decorate-micropage/batch-delete", params);
}

// ==================== Plugin Links Related APIs ====================

/**
 * Get plugin links list
 * @description Retrieves list of all plugin links from extensions
 * @returns Promise with plugin links list
 */
export function apiGetPluginLinks(): Promise<PluginLinksResponse> {
    return useConsoleGet("/decorate-page/plugin-links");
}

// ==================== Apps Decorate Config APIs ====================

/**
 * 应用中心装饰链接项接口
 */
export interface AppsDecorateLinkItem {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
}

/**
 * 应用中心装饰配置接口
 */
export interface AppsDecorateConfig {
    /** 是否启用 */
    enabled: boolean;
    /** 标题 */
    title: string;
    /** 链接配置 */
    link: AppsDecorateLinkItem;
    /** 广告图 URL */
    heroImageUrl: string;
}

/**
 * Get apps decorate config (console)
 * @description 后台获取应用中心运营位配置
 * @returns Promise with apps decorate config
 */
export function apiConsoleGetAppsDecorate(): Promise<AppsDecorateConfig> {
    return useConsoleGet("/apps-decorate");
}

/**
 * Set apps decorate config (console)
 * @description 后台设置应用中心运营位配置
 * @param data 配置数据
 * @returns Promise with updated config
 */
export function apiConsoleSetAppsDecorate(data: AppsDecorateConfig): Promise<AppsDecorateConfig> {
    return useConsolePost("/apps-decorate", data);
}

// ==================== Pages Configuration Related APIs ====================

/**
 * Get pages configuration
 * @description Retrieves pages configuration based on type
 * @param type Configuration type, defaults to '自定义'
 * @returns Promise with pages configuration
 */
export function apiGetPagesConfig(type: string = "自定义"): Promise<PagesConfigResponse> {
    return useConsoleGet("/decorate-page/pages", { type });
}

/**
 * Set pages configuration
 * @description Saves pages configuration data
 * @param type Configuration type, defaults to '自定义'
 * @param data Configuration data to save
 * @returns Promise with save result
 */
export function apiSetPagesConfig(
    type: string = "自定义",
    data: PagesConfig,
): Promise<PagesConfigResponse> {
    return useConsolePost(`/decorate-page/pages?type=${type}`, data);
}
