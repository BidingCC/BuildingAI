/**
 * Category Console API service
 * @description Frontend API functions for category management (Console API)
 * @fileoverview This file contains frontend API service functions for category operations
 * All functions use usePluginConsoleGet/Post/Put/Delete to call the extension's console API endpoints
 */

import type {
    Category,
    CreateCategoryParams,
    QueryCategoryParams,
    UpdateCategoryParams,
} from "../types/category";
import type { OperationResult } from "../types/common";

export type { Category, CreateCategoryParams, QueryCategoryParams, UpdateCategoryParams };
export type { OperationResult } from "../types/common";

/**
 * Create category
 * @param data Category data
 * @returns Created category
 */
export function apiCreateCategory(data: CreateCategoryParams): Promise<Partial<Category>> {
    return usePluginConsolePost<Partial<Category>>("/category", data);
}

/**
 * Query category list
 * @param params Query parameters
 * @returns Category list
 */
export function apiGetCategoryList(params?: QueryCategoryParams): Promise<Category[]> {
    return usePluginConsoleGet<Category[]>("/category", params);
}

/**
 * Get category by id
 * @param id Category id
 * @returns Category detail
 */
export function apiGetCategory(id: string): Promise<Category> {
    return usePluginConsoleGet<Category>(`/category/${id}`);
}

/**
 * Update category
 * @param id Category id
 * @param data Update data
 * @returns Updated category
 */
export function apiUpdateCategory(id: string, data: UpdateCategoryParams): Promise<Category> {
    return usePluginConsolePut<Category>(`/category/${id}`, data);
}

/**
 * Delete category
 * @param id Category id
 * @returns Operation result
 */
export function apiDeleteCategory(id: string): Promise<OperationResult> {
    return usePluginConsoleDelete<OperationResult>(`/category/${id}`);
}

/**
 * Batch delete categories
 * @param ids Category ids
 * @returns Operation result
 */
export function apiBatchDeleteCategories(ids: string[]): Promise<OperationResult> {
    return usePluginConsolePost<OperationResult>("/category/batch-delete", { ids });
}
