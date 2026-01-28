/**
 * @fileoverview Web API service functions for user management
 * @description This file contains API functions for user authentication,
 * user information management, and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type {
    PowerDetailDataWithExtend,
    PowerDetailQueryParams,
} from "@buildingai/service/webapi/power-detail";
import type { RechargeCenterInfo } from "@buildingai/service/webapi/recharge-center";
import type {
    LoginResponse,
    SystemLoginAccountParams,
    SystemRegisrerAccountParams,
    UpdateUserFieldRequest,
    UpdateUserFieldResponse,
    UserInfo,
} from "@buildingai/service/webapi/user";
// ==================== User Information Related APIs ====================

/**
 * Get current user information
 * @description Get the current logged-in user's information
 * @returns Promise with current user information
 */
export function apiGetCurrentUserInfo(): Promise<UserInfo> {
    return useWebGet("/user/info", {}, { requireAuth: false });
}

/**
 * Update user information field
 * @description Update a specific field of user information
 * @param params Update parameters
 * @returns Promise with update result
 */
export function apiUpdateUserField(
    params: UpdateUserFieldRequest,
): Promise<UpdateUserFieldResponse> {
    return useWebPatch("/user/update-field", params);
}

/**
 * Update user information field (backward compatibility)
 * @description Legacy function for updating user fields
 * @param params Field parameters
 * @returns Promise with update result
 * @deprecated Please use apiUpdateUserField instead
 */
export function apiPostUserInfoField(params: {
    field: string;
    value: string;
}): Promise<UpdateUserFieldResponse> {
    return apiUpdateUserField({
        field: params.field as UpdateUserFieldRequest["field"],
        value: params.value,
    });
}

// ==================== WeChat Login Related APIs ====================

/**
 * Get WeChat login QR code
 * @description Get QR code for WeChat login
 * @returns Promise with QR code information
 */
// export function apiGetWxCode(): Promise<WechatLoginCode> {
//     return useWebGet("/auth/wechat-qrcode");
// }

/**
 * Check WeChat login ticket validity
 * @description Check if WeChat login ticket is valid
 * @param params Ticket parameters
 * @returns Promise with ticket status
 */
// export function apiCheckTicket(params?: { key: string }): Promise<WechatLoginTicket> {
//     return useWebGet(`/auth/wechat-qrcode-status/${params?.key}`);
// }

// ==================== SMS Verification Related APIs ====================

/**
 * Send SMS verification code
 * @description Send SMS verification code to mobile number
 * @param params Send parameters
 * @returns Promise with send result
 */
export function apiSmsSend(params?: {
    /** Scene type */
    scene: string;
    /** Mobile number */
    mobile: string;
}): Promise<{ data: string }> {
    return useWebPost("/sms/sendCode", params);
}

// ==================== Account Authentication Related APIs ====================

/**
 * Account/mobile login
 * @description Login with username/password or mobile number
 * @param params Login parameters
 * @returns Promise with login result
 */
export function apiAuthLogin(params?: SystemLoginAccountParams): Promise<LoginResponse> {
    return useWebPost("/auth/login", params);
}

/**
 * WeChat Mini Program login
 * @description Login with WeChat Mini Program using code obtained from wx.login()
 * @param params Login parameters
 * @param params.code Login code obtained from wx.login() API
 * @returns Promise with login result, including user information, token, and isNewUser flag
 */
export function apiAuthWxMpLogin(params: {
    code: string;
}): Promise<LoginResponse & { isNewUser: boolean }> {
    return useWebPost("/auth/wxlogin", params);
}

/**
 * Account registration
 * @description Register new account
 * @param params Registration parameters
 * @returns Promise with registration result
 */
export function apiAuthRegister(params?: SystemRegisrerAccountParams): Promise<{
    token: string;
    user: LoginResponse;
}> {
    return useWebPost("/auth/register", params);
}

// ==================== User Operations Related APIs ====================

/**
 * Bind mobile number
 * @description Bind mobile number to user account
 * @param params Bind parameters
 * @returns Promise with bind result
 */
export function apiUserMobileBind(params?: {
    /** Bind type */
    type: string;
    /** Mobile number */
    mobile: string;
    /** Verification code */
    code: string;
}): Promise<{ data: [] }> {
    return useWebPost("/user/bindMobile", params);
}

/**
 * Reset password
 * @description Reset user password using mobile verification
 * @param params Reset parameters
 * @returns Promise with reset result
 */
export function apiPostResetPassword(params: {
    /** Mobile number */
    mobile: string;
    /** Verification code */
    code: string;
    /** New password */
    password: string;
    /** Confirm password */
    password_confirm: string;
}): Promise<{ data: string }> {
    return useWebPost("/user/resetPassword", params);
}

/**
 * Change user password
 * @description Change user password with old password verification
 * @param params Change password parameters
 * @returns Promise with change result
 */
export function apiChangePassword(params: {
    /** Old password */
    oldPassword: string;
    /** New password */
    newPassword: string;
    /** Confirm password */
    confirmPassword: string;
}): Promise<{ message?: string } | null> {
    return useWebPost("/auth/change-password", params);
}

// ==================== WeChat OAuth Related APIs ====================

/**
 * Get WeChat OAuth auth URL
 * @description Get WeChat OAuth auth URL
 * @param url 跳转链接
 * @returns Promise with auth URL
 */
export function apiGetWechatOAuthAuthUrl(url: string): Promise<string> {
    return useWebGet(`/auth/wechat-oauth-auth-url?url=${encodeURIComponent(url)}`);
}

/**
 * WeChat OAuth login
 * @description WeChat OAuth login
 * @param code 微信公众号code
 * @returns Promise with login result
 */
export function apiAuthWxOaLogin(params: { code: string }): Promise<LoginResponse> {
    return useWebPost("/auth/wechat-oauth-login", params);
}

/**
 * Bind WeChat OAuth
 * @description Bind WeChat OAuth
 * @param code 微信公众号code
 * @returns Promise with bind result
 */

export function apiBindWechatOa(params: { code: string }): Promise<{ message: string }> {
    return useWebPost("/auth/bind-wechatoa", params);
}

/**
 * Get user power detail
 * @description Get user power detail
 * @returns Promise with power detail
 */
export function apiGetUserPowerDetail(
    params?: PowerDetailQueryParams,
): Promise<PowerDetailDataWithExtend> {
    return useWebGet("/user/account-log", params);
}

/**
 * Get recharge center information
 * @description Get recharge center configuration and user information
 * @returns Promise with recharge center information
 */
export function apiGetRechargeCenterInfo(): Promise<RechargeCenterInfo> {
    return useWebGet("/recharge/center");
}
