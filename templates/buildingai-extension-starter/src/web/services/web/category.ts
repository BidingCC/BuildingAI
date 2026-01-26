/**
 * Category Web API service
 * @description Frontend API functions for category management (Web API)
 * @fileoverview This file contains frontend API service functions for category operations
 * All functions use usePluginWebGet to call the extension's web API endpoints
 */

import type { Category, QueryCategoryParams } from "../types/category";

export type { Category, QueryCategoryParams };

/**
 * Query category list
 * @param params Query parameters
 * @returns Category list
 */
export function apiGetCategoryList(params?: QueryCategoryParams): Promise<Category[]> {
    return usePluginWebGet<Category[]>("/category", params);
}

/**
 * Get category by id
 * @param id Category id
 * @returns Category detail
 */
export function apiGetCategory(id: string): Promise<Category> {
    return usePluginWebGet<Category>(`/category/${id}`);
}
