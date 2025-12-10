/**
 * @fileoverview Web API service functions for user management
 * @description This file contains API functions for user authentication,
 * user information management, and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type { MenuFormData } from "../consoleapi/menu";
import type { BaseEntity, Pagination } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Role information interface
 * @description Interface for user role information
 */
export interface RoleInfo extends BaseEntity {
    /** Role name */
    name: string;
    /** Role description */
    description: string;
    /** Whether the role is disabled */
    isDisabled: boolean;
}

/**
 * User information interface
 * @description Interface for user information with all user properties
 */
export interface UserInfo extends BaseEntity {
    /** Username */
    username: string;
    /** User number */
    userNo?: string;
    /** Password */
    password: string;
    /** Nickname */
    nickname?: string;
    /** Email address */
    email?: string;
    /** Phone number */
    phone?: string;
    /** Phone area code */
    phoneAreaCode?: string;
    /** Avatar URL */
    avatar?: string;
    /** Role ID */
    roleId?: string;
    /** User status (0: disabled, 1: enabled) */
    status?: number;
    /** Power value */
    power?: number;
    /** Whether is super admin (0: no, 1: yes) */
    isRoot?: number;
    /** Whether has permissions */
    permissions?: number;
    /** Registration source (0: admin added, 1: phone, 2: WeChat, 3: email, 4: account) */
    source?: number;
    /** Last login time */
    lastLoginAt?: string;
    /** Associated role information */
    role?: RoleInfo;
    /** Creation time */
    /** Deletion time */
    deletedAt?: string;
    /** Real name */
    realName?: string;
    /** Total recharge amount */
    totalRechargeAmount?: number;
}

/**
 * User center interface
 * @description Interface for user center data including user info, permissions, and menus
 */
export interface UserCenter {
    /** User information */
    user: UserInfo;
    /** User permissions */
    permissions: string[];
    /** User menus */
    menus: MenuFormData[];
}

/**
 * Login response interface
 * @description Interface for login response data
 */
export interface LoginResponse {
    /** User nickname */
    nickname: string;
    /** Serial number */
    sn: number;
    /** Email address */
    email: null | string;
    /** Mobile number */
    mobile: string;
    /** Avatar URL */
    avatar: string;
    /** Authentication token */
    token: string;
    /** User information */
    user: UserInfo;
}

/**
 * User query request parameters interface
 * @description Extends base query parameters for user list queries
 */
export type UserQueryRequest = Pagination;

/**
 * User table data interface
 * @description Interface for user data displayed in tables
 */
export type UserTableData = UserInfo;

/**
 * Base user information type
 * @description Excludes auto-generated fields and sensitive information from UserInfo
 */
export type BaseUserInfo = Omit<
    UserInfo,
    "id" | "createdAt" | "updatedAt" | "deletedAt" | "role" | "lastLoginAt" | "isRoot"
>;

/**
 * User creation request interface
 * @description Interface for creating new users
 */
export interface UserCreateRequest extends BaseUserInfo {
    /** Role ID */
    roleId?: string;
}

/**
 * User update request interface
 * @description Interface for updating existing users
 */
export interface UserUpdateRequest
    extends Partial<Omit<UserCreateRequest, "username" | "password">> {
    /** User ID (required for updates) */
    id: string;
}

/**
 * Update user field request interface
 * @description Interface for updating specific user fields
 */
export interface UpdateUserFieldRequest {
    /** Field name to update */
    field: "nickname" | "email" | "phone" | "avatar" | "bio" | "gender";
    /** Field value */
    value: any;
}

/**
 * Update user field response interface
 * @description Interface for update user field response
 */
export interface UpdateUserFieldResponse {
    /** Updated user information */
    user: UserInfo;
    /** Operation result message */
    message: string;
}

/**
 * WeChat login QR code response interface
 * @description Interface for WeChat login QR code response
 */
export interface WechatLoginCode {
    /** QR code key */
    key: string;
    /** QR code image */
    qrcode: string;
    /** QR code URL */
    url: string;
}

/**
 * WeChat login ticket response interface
 * @description Interface for WeChat login ticket status response
 */
export interface WechatLoginTicket {
    /** Login status */
    status: string;
    /** Additional data */
    data?: any;
    /** Whether QR code is scanned */
    is_scan: boolean;
    /** User login response */
    user: LoginResponse;
}

/**
 * System login account parameters interface
 * @description Interface for system account login parameters
 */
export interface SystemLoginAccountParams {
    /** Username */
    username: string;
    /** Password */
    password: string;
    /** Terminal type */
    terminal?: string;
}

/**
 * System registration account parameters interface
 * @description Interface for system account registration parameters
 */
export interface SystemRegisrerAccountParams {
    /** Username */
    username: string;
    /** Password */
    password: string;
    /** Email address */
    email?: string;
    /** Phone number */
    phone?: string;
    /** Terminal type */
    terminal?: string;
}

// ==================== User Information Related APIs ====================

/**
 * Get current user information
 * @description Get the current logged-in user's information
 * @returns Promise with current user information
 */
export function apiGetCurrentUserInfo(): Promise<UserInfo> {
    return useWebGet("/user/info", {}, { requireAuth: true });
}

/**
 * Search user list
 * @description Search users based on keyword and other criteria
 * @param params Search parameters
 * @returns Promise with user list
 */
export function apiSearchUsers(params?: {
    /** Search keyword */
    keyword?: string;
    /** Dataset ID */
    datasetId?: string;
    /** Return count limit */
    limit?: number;
}): Promise<UserInfo[]> {
    return useWebGet("/user/search", params, { requireAuth: true });
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
export function apiGetWxCode(): Promise<WechatLoginCode> {
    return useWebGet("/auth/wechat-qrcode");
}

/**
 * Check WeChat login ticket validity
 * @description Check if WeChat login ticket is valid
 * @param params Ticket parameters
 * @returns Promise with ticket status
 */
export function apiCheckTicket(params?: { key: string }): Promise<WechatLoginTicket> {
    return useWebGet(`/auth/wechat-qrcode-status/${params?.key}`);
}

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
