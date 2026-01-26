/**
 * Article Web API service
 * @description Frontend API functions for article management (Web API)
 * @fileoverview This file contains frontend API service functions for article operations
 * All functions use usePluginWebGet to call the extension's web API endpoints
 */

import type { PaginationResult } from "@buildingai/service/models/globals";

import type { Article, ArticleStatus, QueryArticleParams } from "../types/article";

export type { Article, ArticleStatus, QueryArticleParams };

/**
 * Query article list
 * @param params Query parameters
 * @returns Paginated article list
 */
export function apiGetArticleList(params?: QueryArticleParams): Promise<PaginationResult<Article>> {
    return usePluginWebGet<PaginationResult<Article>>("/article", params);
}

/**
 * Get published articles
 * @param categoryId Optional category filter
 * @returns Published article list
 */
export function apiGetPublishedArticles(categoryId?: string): Promise<Article[]> {
    return usePluginWebGet<Article[]>("/article/published", { categoryId });
}

/**
 * Get article by id
 * @param id Article id
 * @returns Article detail
 */
export function apiGetArticle(id: string): Promise<Article> {
    return usePluginWebGet<Article>(`/article/${id}`);
}
