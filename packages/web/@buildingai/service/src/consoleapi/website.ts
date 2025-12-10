/**
 * @fileoverview Console API service functions for website configuration management
 * @description This file contains API functions for website configuration CRUD operations,
 * and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { WebsiteAgreement, WebsiteCopyright, WebsiteInfo, WebsiteStatistics } from "../common";

/**
 * Website configuration interface
 * @description Complete website configuration including all settings
 */
export interface WebsiteConfig {
    /** Website information */
    webinfo: WebsiteInfo;
    /** Agreement configuration */
    agreement: WebsiteAgreement;
    /** Copyright configuration */
    copyright: WebsiteCopyright;
    /** Statistics configuration */
    statistics: WebsiteStatistics;
}

/**
 * Update website configuration request interface
 * @description Supports partial updates, inherits complete configuration and makes all fields optional
 */
export interface UpdateWebsiteRequest extends Partial<WebsiteConfig> {
    /** Configuration group (optional, used to specify which group to update) */
    group?: "webinfo" | "agreement" | "copyright" | "statistics";
}

/**
 * Get website configuration information
 * @description Get current website configuration information, including website information, agreement, copyright, and statistics
 * @returns Promise with website configuration information
 */
export const apiGetWebsiteConfig = (): Promise<WebsiteConfig> => {
    return useConsoleGet("/system-website");
};

/**
 * Update website configuration information
 * @description Update website configuration information, support partial updates
 * @param data Website configuration data
 * @returns Promise with update result
 */
export const apiUpdateWebsiteConfig = (
    data: UpdateWebsiteRequest,
): Promise<{ success: boolean }> => {
    return useConsolePost("/system-website", data);
};
