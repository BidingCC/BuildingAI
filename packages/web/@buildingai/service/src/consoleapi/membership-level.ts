/**
 * @fileoverview Console API service functions for membership level management
 * @description This file contains API functions for membership level configuration,
 * authentication methods, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity, BaseQueryParams, PaginationResult } from "../models/globals";

// ==================== Type Definitions ====================
export interface Benefit {
    icon: string;
    content: string;
}

export interface LevelFormData extends BaseEntity {
    name: string;
    level: number;
    icon: string;
    givePower: number;
    description: string;
    status: boolean;
    accountCount: number;
    benefits: Benefit[];
}

export interface LevelCreateRequest
    extends Omit<LevelFormData, "id" | "createdAt" | "updatedAt" | "accountCount" | "status"> {}

export interface LevelUpdateRequest extends LevelCreateRequest {
    /** Level ID */
    id: string;
}

export interface LevelQueryRequest extends BaseQueryParams {
    /** Level name */
    name?: string;
    /** Level status */
    status?: boolean;
}

/**
 * Get level list
 * @description Get level list
 * @param params Query parameters
 * @returns Promise with level list
 */
export const apiGetLevelList = (
    params: LevelQueryRequest,
): Promise<PaginationResult<LevelFormData>> => {
    return useConsoleGet("/levels", params);
};

/**
 * Get level list all
 * @description Get level list all
 * @returns Promise with level list all
 */
export const apiGetLevelListAll = (): Promise<LevelFormData[]> => {
    return useConsoleGet("/levels/all");
};

/**
 * Update level status
 * @description Update level status
 * @param id Level ID
 * @param data Level data
 * @returns Promise with updated level
 */
export const apiUpdateLevelStatus = (
    id: string,
    data: { status: boolean },
): Promise<LevelFormData> => {
    return useConsolePatch(`/levels/${id}`, data);
};

/**
 * Get level detail
 * @description Get level detail
 * @param id Level ID
 * @returns Promise with level detail
 */
export const apiGetLevelDetail = (id: string): Promise<LevelFormData> => {
    return useConsoleGet(`/levels/${id}`);
};

/**
 * Update level
 * @description Update level
 * @param data Level data
 * @returns Promise with updated level
 */
export const apiUpdateLevel = (id: string, data: LevelUpdateRequest): Promise<LevelFormData> => {
    return useConsolePatch(`/levels/${id}`, data);
};

/**
 * Create level
 * @description Create level
 * @param data Level data
 * @returns Promise with created level
 */
export const apiCreateLevel = (data: LevelCreateRequest): Promise<LevelFormData> => {
    return useConsolePost("/levels", data);
};

/**
 * Delete level
 * @description Delete level
 * @param id Level ID
 * @returns Promise with deleted level
 */
export const apiDeleteLevel = (id: string): Promise<LevelFormData> => {
    return useConsoleDelete(`/levels/${id}`);
};
