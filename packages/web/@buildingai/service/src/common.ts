/**
 * @fileoverview Common API service functions and type definitions
 * @description This file contains common API functions for website configuration,
 * file uploads, and related type definitions for the BuildingAI service layer.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

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
 * Login method enumeration
 * @description Available login methods for user authentication
 */
export enum LoginMethod {
    /** Account login (username/password) */
    ACCOUNT = 1,
    /** Phone number login */
    PHONE = 2,
    /** WeChat login */
    WEIXIN = 3,
}

/**
 * Login settings interface
 * @description Configuration for user login and registration settings
 */
export interface LoginSettings {
    /** Allowed login methods */
    allowedLoginMethods: LoginMethod[];
    /** Allowed registration methods */
    allowedRegisterMethods: LoginMethod[];
    /** Default login method */
    defaultLoginMethod: LoginMethod;
    /** Whether to allow multiple login sessions */
    allowMultipleLogin: boolean;
    /** Whether to show policy agreement */
    showPolicyAgreement: boolean;
}

// ==================== File Upload Type Definitions ====================

/**
 * File upload response interface
 * @description Response structure for successful file uploads
 */
export interface FileUploadResponse {
    /** Unique file identifier */
    id: string;
    /** File access URL */
    url: string;
    /** Original file name */
    originalName: string;
    /** File size in bytes */
    size: number;
    /** File MIME type */
    type: string;
    /** File extension */
    extension: string;
}

// ==================== Website Configuration Related APIs ====================

/**
 * Get website basic configuration information
 * @description Get website basic information, including website info, copyright info, and statistics
 * @returns {Promise<SiteConfig>} Website basic configuration information
 */
export function apiGetSiteConfig(): Promise<SiteConfig> {
    return useWebGet<SiteConfig>("/config");
}

/**
 * Get agreement configuration information
 * @description Get website agreement-related configuration separately, including service agreement and privacy agreement
 * @returns {Promise<{ agreement: WebsiteConfig["agreement"] }>} Agreement configuration information
 */
export function apiGetAgreementConfig(): Promise<{ agreement: WebsiteConfig["agreement"] }> {
    return useWebGet<{ agreement: WebsiteConfig["agreement"] }>("/config/agreement");
}

/**
 * Get login settings
 * @description Get configuration information for the frontend login page (login methods, default login method, whether to allow multiple logins, whether to display agreements, etc.)
 * @returns {Promise<LoginSettings>} Login settings information
 */
export function apiGetLoginSettings(): Promise<LoginSettings> {
    return useWebGet<LoginSettings>("/user/login-settings");
}

// ==================== File Upload Related APIs ====================

/**
 * Get extension ID from runtime config
 * @description Automatically retrieves extension ID from runtime config if available
 * @param providedExtensionId Extension ID provided by user (optional)
 * @returns Extension ID string or undefined
 */
function getExtensionId(providedExtensionId?: string): string | undefined {
    if (providedExtensionId) return providedExtensionId;
    try {
        return useRuntimeConfig().public.pluginName as string | undefined;
    } catch {
        return undefined;
    }
}

/**
 * General file upload method - single file upload
 * @description Upload a single file to the server
 * @param params Upload parameters
 * @param params.file File object to upload
 * @param params.description File description (optional)
 * @param options Upload options
 * @param options.onProgress Upload progress callback function
 * @returns Promise with file information after successful upload
 */
export function apiUploadFile(
    params: { file: File; description?: string; extensionId?: string },
    options?: { onProgress?: (percent: number) => void },
): Promise<FileUploadResponse> {
    const extensionId = getExtensionId(params.extensionId);
    return useWebUpload<FileUploadResponse>(
        `/upload/file`,
        { ...params, ...(extensionId && { extensionId }) },
        options,
    );
}

/**
 * General file upload method - multiple file upload
 * @description Upload multiple files to the server
 * @param params Upload parameters
 * @param params.files Array of file objects to upload
 * @param params.description File description (optional)
 * @param options Upload options
 * @param options.onProgress Upload progress callback function
 * @returns Promise with array of file information after successful upload
 */
export function apiUploadFiles(
    params: { files: File[]; description?: string; extensionId?: string },
    options?: { onProgress?: (percent: number) => void },
): Promise<FileUploadResponse[]> {
    const extensionId = getExtensionId(params.extensionId);
    return useWebUpload<FileUploadResponse[]>(
        `/upload/files`,
        { ...params, ...(extensionId && { extensionId }) },
        options,
    );
}

/**
 * Initialization file upload method - single file upload for system initialization
 * @description Upload a single file during system initialization (e.g., avatar, logo)
 * @param params Upload parameters
 * @param params.file File object to upload
 * @param params.description File description (optional)
 * @param options Upload options
 * @param options.onProgress Upload progress callback function
 * @returns Promise with file information after successful upload
 */
export function apiUploadInitFile(
    params: { file: File; description?: string },
    options?: { onProgress?: (percent: number) => void },
): Promise<FileUploadResponse> {
    return useWebUpload<FileUploadResponse>(`/upload/init-file`, params, options);
}

/**
 * Remote file upload method - upload a remote file to the server
 * @description Upload a remote file to the server
 * @param params Upload parameters
 * @param params.url Remote file URL
 * @param params.description File description (optional)
 * @returns Promise with file information after successful upload
 */
export function apiUploadRemoteFile(params: {
    url: string;
    description?: string;
}): Promise<FileUploadResponse> {
    return useWebPost<FileUploadResponse>(`/upload/remote`, params);
}

// ==================== Behaviour Analysis Related Types ====================

/**
 * Behaviour action type enumeration
 * @description Available action types for behaviour analysis
 */
export enum AnalyseActionType {
    /** Page visit */
    PAGE_VISIT = "page_visit",
    /** Plugin use */
    PLUGIN_USE = "plugin_use",
    /** API call */
    API_CALL = "api_call",
    /** Other behaviour */
    OTHER = "other",
}

/**
 * Record behaviour analysis request interface
 * @description Request interface for recording user behaviour
 */
export interface RecordAnalyseRequest {
    /** Action type */
    actionType: AnalyseActionType;
    /** Behaviour source/identifier
     * - PAGE_VISIT: Page path (e.g., /console/dashboard)
     * - PLUGIN_USE: Plugin name
     * - API_CALL: API path
     * - OTHER: Other behaviour identifier
     */
    source: string;
    /** Extra data (optional) */
    extraData?: Record<string, any>;
}

/**
 * Record behaviour analysis response interface
 * @description Response interface for recording user behaviour
 */
export type RecordAnalyseResponse = { recorded: boolean; message: string } | { message: string };

// ==================== Behaviour Analysis Related APIs ====================

/**
 * Record behaviour analysis
 * @description Unified interface for recording all types of user behaviour
 * - PAGE_VISIT: Records only once per user/IP within 30 minutes
 * - PLUGIN_USE: Direct recording
 * - API_CALL: Direct recording
 * - OTHER: Direct recording
 * @param params Record parameters
 * @param params.actionType Action type (page_visit, plugin_use, api_call, other)
 * @param params.source Behaviour source/identifier
 * @param params.extraData Extra data (optional)
 * @returns Promise with record result
 */
export function apiRecordAnalyse(params: RecordAnalyseRequest): Promise<RecordAnalyseResponse> {
    return useWebPost<RecordAnalyseResponse>("/analyse", params);
}
