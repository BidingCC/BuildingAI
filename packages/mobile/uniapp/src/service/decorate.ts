/**
 * @fileoverview Web API service functions for page decoration and layout management
 * @description This file contains API functions for layout configuration,
 * micro page management, and related type definitions for the mobile frontend.
 *
 * @author BuildingAI Teams
 */

// ==================== Pages Configuration Related APIs ====================

/**
 * Pages configuration interface
 * @description Interface for pages configuration data
 */
export interface PagesConfig {
    /** Configuration data, structure defined by frontend */
    [key: string]: any;
}

/**
 * Get pages configuration
 * @description Retrieves pages configuration based on type (public API, no authentication required)
 * @param type Configuration type, defaults to '自定义'
 * @returns Promise with pages configuration data
 */
export function apiGetPagesConfig(type: string = ""): Promise<PagesConfig> {
    return useWebGet("/decorate-page/pages", { type });
}
