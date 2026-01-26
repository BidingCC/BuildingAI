/**
 * @fileoverview Console API service functions for menu management
 * @description This file contains API functions for menu CRUD operations,
 * menu tree structure management, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity, Pagination, PaginationResult } from "../models/globals";

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
 * Menu form data interface
 * @description Interface for menu form data with all menu properties
 */
export interface MenuFormData extends BaseEntity {
    /** Menu name */
    name: string;
    /** Menu route path */
    path?: string;
    /** Menu icon */
    icon?: string;
    /** Menu type: 0-directory, 1-menu, 2-button */
    type: number;
    /** Parent menu ID */
    parentId: string | number | null;
    /** Permission code */
    permissionCode?: string;
    /** Source type: 1-system, 2-plugin */
    sourceType: number;
    /** Sort order */
    sort?: number;
    /** Whether to hide: 0-visible, 1-hidden */
    isHidden?: number;
    /** Component path */
    component?: string;
    /** Child menus */
    children?: MenuFormData[];
}

/**
 * Menu query request parameters interface
 * @description Interface for menu query request parameters with pagination
 */
export interface MenuQueryRequest extends Pagination {
    /** Menu name filter */
    name?: string;
    /** Menu type filter */
    type?: number | null;
    /** Parent menu ID filter */
    parentId?: string | null;
}

/**
 * Menu creation request type
 * @description Excludes auto-generated fields and children from MenuFormData
 */
export type MenuCreateRequest = Omit<MenuFormData, "id" | "createdAt" | "updatedAt" | "children">;

/**
 * Menu update request type
 * @description Inherits from creation request and makes all fields optional
 */
export type MenuUpdateRequest = Partial<MenuCreateRequest>;

// ==================== Menu Query Related APIs ====================

/**
 * Get menu list
 * @description Get paginated menu list based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated menu list result
 */
export function apiGetMenuList(params: MenuQueryRequest): Promise<PaginationResult<MenuFormData>> {
    return useConsoleGet("/menu", params);
}

/**
 * Get menu tree
 * @description Get menu tree structure based on source type
 * @param sourceType Menu tree source type: 1-system menu, 2-plugin menu
 * @returns Promise with menu tree structure
 */
export function apiGetMenuTree(sourceType: number): Promise<MenuFormData[]> {
    return useConsoleGet("/menu/tree", { sourceType });
}

/**
 * Get menu detail
 * @description Get detailed menu information by menu ID
 * @param id Menu ID
 * @returns Promise with menu detail information
 */
export function apiGetMenuDetail(id: string): Promise<MenuFormData> {
    return useConsoleGet(`/menu/${id}`);
}

// ==================== Menu Management Related APIs ====================

/**
 * Create menu
 * @description Create a new menu item
 * @param data Menu creation data
 * @returns Promise with created menu information
 */
export function apiCreateMenu(data: MenuCreateRequest): Promise<MenuFormData> {
    return useConsolePost("/menu", data);
}

/**
 * Update menu
 * @description Update menu information by menu ID
 * @param id Menu ID
 * @param data Menu update data
 * @returns Promise with updated menu information
 */
export function apiUpdateMenu(id: string, data: MenuUpdateRequest): Promise<MenuFormData> {
    return useConsolePut(`/menu/${id}`, data);
}

/**
 * Delete menu
 * @description Delete specified menu by menu ID
 * @param id Menu ID
 * @returns Promise with deletion result
 */
export function apiDeleteMenu(id: string): Promise<DeleteResponse> {
    return useConsoleDelete(`/menu/${id}`);
}

/**
 * Batch delete menus
 * @description Delete multiple menus by menu ID array
 * @param params Batch deletion parameters
 * @param params.ids Array of menu IDs
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteMenu(params: { ids: string[] }): Promise<DeleteResponse> {
    return useConsolePost("/menu/batch-delete", params);
}
