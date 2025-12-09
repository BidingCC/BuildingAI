/**
 * @fileoverview Web API service functions for tag management
 * @description This file contains API functions for tag query operations and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type { TagQueryRequest } from "../consoleapi/tag";
import type { BaseEntity } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Tag interface
 * @description Interface for tag information
 */
export interface Tag extends BaseEntity {
    /** Tag name */
    name: string;
    /** Tag type */
    type: string;
    /** Binding count */
    bindingCount: number;
}

// ==================== Tag Query Related APIs ====================

/**
 * Get tag list
 * @description Get tag list based on query conditions (public endpoint)
 * @param params Query parameters
 * @returns Promise with tag list result
 */
export function apiGetTagList(params?: TagQueryRequest): Promise<Tag[]> {
    return useWebGet("/tag", params);
}
