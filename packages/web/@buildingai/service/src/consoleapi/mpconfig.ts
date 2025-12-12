/**
 * @fileoverview Console API service functions for WeChat Mini Program configuration
 * @description This file contains API functions for WeChat Mini Program configuration,
 * authentication settings, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * WeChat Mini Program configuration interface
 * @description Interface for WeChat Mini Program configuration settings
 */
export interface WxMpConfig {
    /** WeChat Mini Program Name */
    name: string;
    /** WeChat Mini Program QR Code */
    qrCode: string;
    /** WeChat Mini Program Original ID */
    originalId: string;
    /** WeChat Mini Program App ID */
    appId: string;
    /** WeChat Mini Program App Secret */
    appSecret: string;
    /** Upload key */
    uploadKey: string;
}

/**
 * Update WeChat Mini Program configuration DTO interface
 * @description Parameters for updating WeChat Mini Program configuration
 */
export type UpdateWxMpConfigDto = WxMpConfig;

/**
 * Get WeChat Mini Program configuration
 * @description Get current WeChat Mini Program configuration settings
 * @returns Promise with WeChat Mini Program configuration
 */
export function apiGetWxMpConfig(): Promise<WxMpConfig> {
    return useConsoleGet("/wxmpconfig");
}

/**
 * Update WeChat Mini Program configuration
 * @description Update WeChat Mini Program configuration settings
 * @param data Configuration update data
 * @returns Promise with updated WeChat Mini Program configuration
 */
export function apiUpdateWxMpConfig(data: UpdateWxMpConfigDto): Promise<{ success: boolean }> {
    return useConsolePatch("/wxmpconfig", data);
}
