/**
 * @fileoverview Web API service functions for apps center management
 * @description This file contains API functions for apps center decoration config,
 * public extension list queries, and related type definitions for the web interface.
 *
 * @author BuildingAI Teams
 */

import type { ExtensionFormData } from "../consoleapi/extensions";
import type { BaseQueryParams, PaginationResult } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Apps decorate link item interface
 * @description 应用中心装修链接项数据结构
 */
export interface AppsDecorateLinkItem {
    /** 链接类型 */
    type?: string;
    /** 链接名称 */
    name?: string;
    /** 链接路径 */
    path?: string;
    /** 链接查询参数 */
    query?: Record<string, unknown>;
}

/**
 * Apps decorate config interface
 * @description 应用中心装修配置数据结构
 */
export interface AppsDecorateConfig {
    /** 是否启用 */
    enabled: boolean;
    /** 标题 */
    title: string;
    /** 链接配置 */
    link: AppsDecorateLinkItem;
    /** 广告图片 URL */
    heroImageUrl: string;
}

/**
 * Query public apps parameters interface
 * @description 查询公开应用列表参数
 */
export interface QueryPublicAppsParams extends BaseQueryParams {
    /** 应用名称（模糊搜索） */
    name?: string;
    /** 应用标识符（模糊搜索） */
    identifier?: string;
}

// ==================== Apps Center Related APIs ====================

/**
 * Get apps decorate config
 * @description 获取应用中心装修配置
 * @returns Promise with apps decorate config
 */
export function apiGetAppsDecorate(): Promise<AppsDecorateConfig> {
    return useWebGet("/apps-decorate");
}

/**
 * Get public apps list
 * @description 获取公开应用列表（已启用的应用）
 * @param params 查询参数
 * @returns Promise with paginated apps list
 */
export function apiGetPublicApps(
    params?: QueryPublicAppsParams,
): Promise<PaginationResult<ExtensionFormData>> {
    return useWebGet("/extension", params);
}
