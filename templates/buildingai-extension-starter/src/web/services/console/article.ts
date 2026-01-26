/**
 * Article Console API service
 * @description Frontend API functions for article management (Console API)
 * @fileoverview This file contains frontend API service functions for article operations
 * All functions use usePluginConsoleGet/Post/Put/Delete to call the extension's console API endpoints
 */

import type { PaginationResult } from "@buildingai/service/models/globals";

import type {
    Article,
    CreateArticleParams,
    QueryArticleParams,
    UpdateArticleParams,
} from "../types/article";
import { ArticleStatus } from "../types/article";
import type { OperationResult } from "../types/common";

export type { Article, CreateArticleParams, QueryArticleParams, UpdateArticleParams };
export { ArticleStatus };
export type { OperationResult } from "../types/common";

/**
 * Create article
 * @param data Article data
 * @returns Created article
 */
export function apiCreateArticle(data: CreateArticleParams): Promise<Partial<Article>> {
    return usePluginConsolePost<Partial<Article>>("/article", data);
}

/**
 * Query article list
 * @param params Query parameters
 * @returns Paginated article list
 */
export function apiGetArticleList(params?: QueryArticleParams): Promise<PaginationResult<Article>> {
    return usePluginConsoleGet<PaginationResult<Article>>("/article", params);
}

/**
 * Get article by id
 * @param id Article id
 * @returns Article detail
 */
export function apiGetArticle(id: string): Promise<Article> {
    return usePluginConsoleGet<Article>(`/article/${id}`);
}

/**
 * Update article
 * @param id Article id
 * @param data Update data
 * @returns Updated article
 */
export function apiUpdateArticle(id: string, data: UpdateArticleParams): Promise<Article> {
    return usePluginConsolePut<Article>(`/article/${id}`, data);
}

/**
 * Delete article
 * @param id Article id
 * @returns Operation result
 */
export function apiDeleteArticle(id: string): Promise<OperationResult> {
    return usePluginConsoleDelete<OperationResult>(`/article/${id}`);
}

/**
 * Batch delete articles
 * @param ids Article ids
 * @returns Operation result
 */
export function apiBatchDeleteArticles(ids: string[]): Promise<OperationResult> {
    return usePluginConsolePost<OperationResult>("/article/batch-delete", { ids });
}

/**
 * Publish article
 * @param id Article id
 * @returns Operation result
 */
export function apiPublishArticle(id: string): Promise<OperationResult> {
    return usePluginConsolePost<OperationResult>(`/article/${id}/publish`);
}

/**
 * Unpublish article
 * @param id Article id
 * @returns Operation result
 */
export function apiUnpublishArticle(id: string): Promise<OperationResult> {
    return usePluginConsolePost<OperationResult>(`/article/${id}/unpublish`);
}
