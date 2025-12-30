/**
 * @fileoverview Console API service functions for WeChat Mini Program version management
 * @description This file contains API functions for WeChat Mini Program version management,
 * including upload, preview, history, and sourcemap operations.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * WeChat Mini Program version type
 */
export enum WxMpVersionType {
    /** Upload version */
    UPLOAD = "upload",
    /** Preview version */
    PREVIEW = "preview",
}

/**
 * WeChat Mini Program version status
 */
export enum WxMpVersionStatus {
    /** Uploading */
    UPLOADING = "uploading",
    /** Success */
    SUCCESS = "success",
    /** Failed */
    FAILED = "failed",
}

/**
 * WeChat Mini Program version interface
 */
export interface WxMpVersion {
    /** Version ID */
    id: string;
    /** Version number */
    version: string;
    /** Version description */
    description: string;
    /** Version type */
    type: WxMpVersionType;
    /** Version status */
    status: WxMpVersionStatus;
    /** Uploader ID */
    uploaderId: string;
    /** Uploader name */
    uploaderName: string;
    /** Package size (bytes) */
    packageSize: number;
    /** QR code URL (for preview versions) */
    qrcodeUrl?: string;
    /** QR code path (for preview versions) */
    qrcodePath?: string;
    /** Error message (for failed uploads) */
    errorMessage?: string;
    /** Package path */
    packagePath?: string;
    /** SourceMap file path */
    sourceMapPath?: string;
    /** SourceMap file size (bytes) */
    sourceMapSize?: number;
    /** Created at */
    createdAt: string;
    /** Updated at */
    updatedAt: string;
}

/**
 * Upload WeChat Mini Program version DTO
 */
export interface UploadMpVersionDto {
    /** Version number */
    version: string;
    /** Version description */
    description?: string;
}

/**
 * Preview WeChat Mini Program version DTO
 */
export interface PreviewMpVersionDto {
    /** Preview description */
    description?: string;
}

/**
 * Upload version response
 */
export interface UploadVersionResponse {
    /** Version ID */
    id: string;
    /** Version number */
    version: string;
    /** Status */
    status: WxMpVersionStatus;
    /** Message */
    message: string;
}

/**
 * Preview version response
 */
export interface PreviewVersionResponse {
    /** Version ID */
    id: string;
    /** QR code URL */
    qrcodeUrl: string;
    /** Status */
    status: WxMpVersionStatus;
    /** Message */
    message: string;
}

/**
 * SourceMap response
 */
export interface SourceMapResponse {
    /** SourceMap file path */
    sourceMapPath: string;
    /** SourceMap file URL */
    sourceMapUrl: string;
    /** Version number */
    version: string;
    /** Created at */
    createdAt: string;
}

/**
 * Upload WeChat Mini Program version
 * @description Upload a new version of the WeChat Mini Program
 * @param data Upload version data
 * @returns Promise with upload result
 */
export function apiUploadMpVersion(data: UploadMpVersionDto): Promise<UploadVersionResponse> {
    return useConsolePost<UploadVersionResponse>("/wxmp-version/upload", data);
}

/**
 * Preview WeChat Mini Program version
 * @description Generate preview QR code for the WeChat Mini Program
 * @param data Preview version data
 * @returns Promise with preview result
 */
export function apiPreviewMpVersion(data: PreviewMpVersionDto): Promise<PreviewVersionResponse> {
    return useConsolePost<PreviewVersionResponse>("/wxmp-version/preview", data);
}

/**
 * Get WeChat Mini Program version history
 * @description Get paginated list of WeChat Mini Program versions
 * @param params Query parameters
 * @returns Promise with paginated version list
 */
export function apiGetMpVersionHistory(params?: {
    page?: number;
    pageSize?: number;
    type?: WxMpVersionType;
}): Promise<{
    data: WxMpVersion[];
    total: number;
    page: number;
    pageSize: number;
}> {
    return useConsoleGet<{
        data: WxMpVersion[];
        total: number;
        page: number;
        pageSize: number;
    }>("/wxmp-version/history", params);
}

/**
 * Get latest SourceMap
 * @description Get SourceMap for the latest uploaded version
 * @returns Promise with SourceMap information
 */
export function apiGetLatestSourceMap(): Promise<SourceMapResponse> {
    return useConsoleGet<SourceMapResponse>("/wxmp-version/sourcemap");
}

/**
 * Get WeChat Mini Program version detail
 * @description Get detailed information about a specific version
 * @param id Version ID
 * @returns Promise with version detail
 */
export function apiGetMpVersionDetail(id: string): Promise<WxMpVersion> {
    return useConsoleGet<WxMpVersion>(`/wxmp-version/${id}`);
}
