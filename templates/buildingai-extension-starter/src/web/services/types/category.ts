/**
 * Category types
 * @description Shared type definitions for category
 */

export interface Category {
    id: string;
    name: string;
    description?: string;
    sort: number;
    articleCount: number;
    createdAt: Date;
    updatedAt: Date;
    articles?: Array<{
        id: string;
        title: string;
    }>;
}

export interface QueryCategoryParams {
    name?: string;
}

export interface CreateCategoryParams {
    name: string;
    description?: string;
    sort?: number;
}

export interface UpdateCategoryParams {
    name?: string;
    description?: string;
    sort?: number;
}
