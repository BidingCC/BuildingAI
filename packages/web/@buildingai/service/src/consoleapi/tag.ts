/**
 * @fileoverview Console API service functions for tag management
 * @description This file contains API functions for tag CRUD operations and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * API response interface for delete operations
 * @description Standard response structure for delete operations
 */
export interface DeleteResponse {
    /** Response message */
    message: string;
    /** Operation success status */
    success: boolean;
}

/**
 * Tag form data interface
 * @description Interface for tag form data with all tag properties
 */
export interface TagFormData extends BaseEntity {
    /** Tag name */
    name: string;
    /** Tag type */
    type: string;
    /** Binding count */
    bindingCount: number;
}

/**
 * Tag query request parameters interface
 * @description Interface for tag query request parameters
 */
export interface TagQueryRequest {
    /** Tag name filter */
    name?: string;
    /** Tag type filter */
    type?: string;
}

/**
 * Tag creation request type
 * @description Excludes auto-generated fields from TagFormData
 */
export type TagCreateRequest = Omit<TagFormData, "id" | "createdAt" | "updatedAt" | "bindingCount">;

/**
 * Tag update request type
 * @description Inherits from creation request and makes all fields optional
 */
export type TagUpdateRequest = Partial<TagCreateRequest>;

// ==================== Tag Query Related APIs ====================

/**
 * Get tag list
 * @description Get tag list based on query conditions
 * @param params Query parameters
 * @returns Promise with tag list result
 */
export function apiGetTagList(params?: TagQueryRequest): Promise<TagFormData[]> {
    return useConsoleGet("/tag", params);
}

/**
 * Get tag detail
 * @description Get detailed tag information by tag ID
 * @param id Tag ID
 * @returns Promise with tag detail information
 */
export function apiGetTagDetail(id: string): Promise<TagFormData> {
    return useConsoleGet(`/tag/${id}`);
}

// ==================== Tag Management Related APIs ====================

/**
 * Create tag
 * @description Create a new tag
 * @param data Tag creation data
 * @returns Promise with created tag information
 */
export function apiCreateTag(data: TagCreateRequest): Promise<TagFormData> {
    return useConsolePost("/tag", data);
}

/**
 * Update tag
 * @description Update tag information by tag ID
 * @param id Tag ID
 * @param data Tag update data
 * @returns Promise with updated tag information
 */
export function apiUpdateTag(id: string, data: TagUpdateRequest): Promise<TagFormData> {
    return useConsolePut(`/tag/${id}`, data);
}

/**
 * Delete tag
 * @description Delete specified tag by tag ID
 * @param id Tag ID
 * @returns Promise with deletion result
 */
export function apiDeleteTag(id: string): Promise<DeleteResponse> {
    return useConsoleDelete(`/tag/${id}`);
}

/**
 * Batch delete tags
 * @description Delete multiple tags by tag ID array
 * @param params Batch deletion parameters
 * @param params.ids Array of tag IDs
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteTag(params: { ids: string[] }): Promise<DeleteResponse> {
    return useConsolePost("/tag/batch-delete", params);
}
