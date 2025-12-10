/**
 * @fileoverview Console API service functions for login settings management
 * @description This file contains API functions for login settings configuration,
 * authentication methods, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * Login method enumeration
 * @description Available login methods for user authentication
 */
export enum LoginMethod {
    /** Account login */
    ACCOUNT = 1,
    /** Phone login */
    PHONE = 2,
    /** WeChat login */
    WEIXIN = 3,
}
export type LoginMethodType = keyof typeof LoginMethod;

/**
 * Login settings interface
 * @description Interface for login configuration settings
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

// ==================== Login Settings Related APIs ====================

/**
 * Get login settings
 * @description Get current login settings information
 * @returns Promise with login settings information
 */
export const apiGetLoginSettings = (): Promise<LoginSettings> => {
    return useConsoleGet("/users/login-settings");
};

/**
 * Update login settings
 * @description Update login settings information with support for partial updates
 * @param data Login settings data
 * @returns Promise with update result
 */
export const apiUpdateLoginSettings = (data: LoginSettings): Promise<{ success: boolean }> => {
    return useConsolePost("/users/login-settings", data);
};
