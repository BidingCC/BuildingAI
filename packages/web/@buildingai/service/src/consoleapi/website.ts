/**
 * @fileoverview Console API service functions for website configuration management
 * @description This file contains API functions for website configuration CRUD operations,
 * and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

/**
 * Site configuration interface
 * @description Main configuration interface for website settings
 */
export interface SiteConfig {
    /** Website information */
    webinfo: WebsiteInfo;
    /** Copyright information */
    copyright: WebsiteCopyright;
    /** Statistics configuration */
    statistics: WebsiteStatistics;
    /** Agreement configuration */
    agreement: Agreement;
}

/**
 * Website information configuration interface
 * @description Configuration for website basic information
 */
export interface WebsiteInfo {
    /** Website name */
    name: string;
    /** Website description */
    description?: string;
    /** Website icon URL */
    icon: string;
    /** Website logo URL */
    logo: string;
    /** SPA loading icon URL */
    spaLoadingIcon?: string;
    /** Website version */
    version?: string;
}

/**
 * Agreement configuration interface
 * @description Configuration for website agreements and policies
 */
export interface Agreement {
    /** Payment agreement title */
    paymentTitle: string;
    /** Payment agreement content */
    paymentContent: string;
    /** Privacy policy title */
    privacyTitle: string;
    /** Privacy policy content */
    privacyContent: string;
    /** Service agreement title */
    serviceTitle: string;
    /** Service agreement content */
    serviceContent: string;
    /** Last update time */
    updateAt: string;
}

/**
 * Website agreement configuration interface
 * @description Configuration for website agreements and policies
 */
export interface WebsiteAgreement {
    /** Service agreement title */
    serviceTitle: string;
    /** Service agreement content */
    serviceContent: string;
    /** Privacy policy title */
    privacyTitle: string;
    /** Privacy policy content */
    privacyContent: string;
    /** Payment agreement title */
    paymentTitle: string;
    /** Payment agreement content */
    paymentContent: string;
    /** Last update time */
    updateAt?: string;
}

/**
 * Website copyright configuration interface
 * @description Configuration for website copyright information
 */
export interface WebsiteCopyright {
    /** Copyright display name */
    displayName: string;
    /** Copyright icon URL */
    iconUrl: string;
    /** Copyright link URL */
    url: string;
}

/**
 * Website statistics configuration interface
 * @description Configuration for website analytics and statistics
 */
export interface WebsiteStatistics {
    /** Statistics application ID */
    appid: string;
}

/**
 * Website configuration interface
 * @description Configuration for website information, copyright, statistics, and agreement
 */
export interface WebsiteConfig {
    /** Website information */
    webinfo: WebsiteInfo;
    /** Copyright information */
    copyright: WebsiteCopyright;
    /** Statistics configuration */
    statistics: WebsiteStatistics;
    /** Agreement configuration */
    agreement: Agreement;
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
