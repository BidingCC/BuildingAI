/**
 * @fileoverview Console API service functions for system management
 * @description This file contains API functions for system initialization,
 * system info operations, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * System information response interface
 * @description Interface for system information response
 */
export interface SystemInfo {
    /** Whether the system is initialized */
    isInitialized: boolean;
    /** Current system version */
    version?: string;
}

/**
 * Runtime system information response interface
 * @description Interface for runtime system information (version & systemId)
 */
export interface SystemRuntimeInfo {
    /** Current system version */
    version: string;
    /** Unique system ID */
    systemId: string;
}

/**
 * System initialization request interface
 * @description Interface for system initialization request with admin user data and website configuration
 */
export interface SystemInitializeRequest {
    /** Admin username */
    username: string;
    /** Admin password */
    password: string;
    /** Confirm password */
    confirmPassword: string;
    /** Admin nickname (optional) */
    nickname?: string;
    /** Admin email (optional) */
    email?: string;
    /** Admin phone (optional) */
    phone?: string;
    /** Admin avatar URL (optional) */
    avatar?: string;
    /** Website name (optional) */
    websiteName?: string;
    /** Website logo URL (optional) */
    websiteLogo?: string;
    /** Website icon URL (optional) */
    websiteIcon?: string;
}

/**
 * System initialization response interface
 * @description Interface for system initialization response with auto-login token
 */
export interface SystemInitializeResponse {
    /** Whether the system is initialized */
    isInitialized: boolean;
    /** Access token for auto-login */
    token?: string;
    /** Token expiration timestamp */
    expiresAt?: number;
    /** User information */
    user?: {
        id: number;
        username: string;
        nickname: string;
        email: string;
        phone: string;
        avatar: string;
        isRoot: number;
        role: any[];
        permissions: any[];
    };
}

// ==================== System Related APIs ====================

/**
 * Get system information
 * @description Get current system information, including initialization status
 * @returns Promise with system information
 */
export function apiGetSystemInfo(): Promise<SystemInfo> {
    return useConsoleGet("/system/initialize", {}, { requireAuth: false });
}

/**
 * Get runtime system information
 * @description Get current runtime system information for console display
 * @returns Promise with runtime system information
 */
export function apiGetSystemRuntimeInfo(): Promise<SystemRuntimeInfo> {
    return useConsoleGet("/system/runtime");
}

/**
 * Initialize system
 * @description Initialize system with admin user data
 * @param data System initialization data
 * @returns Promise with initialization result
 */
export function apiInitializeSystem(
    data: SystemInitializeRequest,
): Promise<SystemInitializeResponse> {
    return useConsolePost("/system/initialize", data, { requireAuth: false });
}

/**
 * Restart application
 * @description Restart the application
 * @returns Promise with restart result
 */
export function apiRestartApplication(): Promise<{ success: boolean; message: string }> {
    return useConsolePost("/system/restart");
}
