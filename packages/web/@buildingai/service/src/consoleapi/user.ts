/**
 * @fileoverview Console API service functions for user management
 * @description This file contains API functions for user CRUD operations,
 * user status management, password operations, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { PaginationResult } from "../models/globals";
import type {
    UserCreateRequest,
    UserInfo,
    UserQueryRequest,
    UserUpdateRequest,
} from "../webapi/user";
import type { ActionValueType } from "./account-balance";
import type { MenuFormData } from "./menu";
import type { RoleFormData } from "./role";

/**
 * Console user information interface
 * @description Interface for console user information including menus, permissions and user details
 */
export interface ConsoleUserInfo {
    /** User menu list */
    menus?: MenuFormData[];
    /** User permission list */
    permissions?: string[];
    /** User basic information */
    user?: UserInfo;
}

// ==================== User Query Related APIs ====================

/**
 * Get user list
 * @description Get paginated user list based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated user list result
 */
export function apiGetUserList(params: UserQueryRequest): Promise<PaginationResult<UserInfo>> {
    return useConsoleGet("/users", params);
}

/**
 * Get user roles list
 * @description Get all roles list in the system without pagination
 * @returns Promise with all roles list
 */
export function apiGetUserRolesList(): Promise<RoleFormData[]> {
    return useConsoleGet("/users/roles");
}

/**
 * Get user detail
 * @description Get detailed user information by user ID
 * @param id User ID
 * @returns Promise with user detail information
 */
export function apiGetUserDetail(id: string): Promise<UserInfo> {
    return useConsoleGet(`/users/${id}`);
}

/**
 * Get all user information
 * @description Get complete information of current logged-in user, including basic info, menu permissions and permission list
 * @returns Promise with user information data
 */
export function apiGetUserInfo(): Promise<ConsoleUserInfo> {
    return useConsoleGet<ConsoleUserInfo>("/users/info");
}

// ==================== User Management Related APIs ====================

/**
 * Create user
 * @description Create a new user account
 * @param data User creation data
 * @returns Promise with created user information
 */
export function apiCreateUser(data: UserCreateRequest): Promise<UserInfo> {
    return useConsolePost("/users", data);
}

/**
 * Update user
 * @description Update user information by user ID
 * @param id User ID
 * @param data User update data
 * @returns Promise with updated user information
 */
export function apiUpdateUser(id: string, data: UserUpdateRequest): Promise<UserInfo> {
    return useConsolePatch(`/users/${id}`, data);
}

/**
 * Delete user
 * @description Delete a single user by user ID
 * @param id User ID
 * @returns Promise with deletion result
 */
export function apiDeleteUser(id: string): Promise<{ success: boolean }> {
    return useConsoleDelete(`/users/${id}`);
}

/**
 * Batch delete users
 * @description Batch delete multiple users by user ID array
 * @param ids Array of user IDs
 * @returns Promise with deletion result
 */
export function apiBatchDeleteUser(ids: string[]): Promise<{ success: boolean }> {
    return useConsolePost("/users/batch-delete", { ids });
}

// ==================== User Operations Related APIs ====================

/**
 * Reset user password
 * @description Administrator resets the password for specified user
 * @param id User ID
 * @param password New password
 * @returns Promise with reset result
 */
export function apiResetUserPassword(id: string, password: string): Promise<{ success: boolean }> {
    return useConsolePost(`/users/reset-password/${id}`, { password });
}

/**
 * Generate random password
 * @description Generate a random password for user
 * @param id User ID
 * @returns Promise with generated password
 */
export function apiGenerateRandomPassword(id: string): Promise<{ password: string }> {
    return useConsolePost(`/users/reset-password-auto/${id}`);
}

/**
 * Set user status
 * @description Set user's enabled/disabled status
 * @param id User ID
 * @param status Status value
 * @returns Promise with updated user information
 */
export function apiSetUserStatus(id: string, status: number): Promise<UserInfo> {
    return useConsolePost(`/users/status/${id}`, { status });
}

/**
 * Update user balance
 * @description Update specified user's balance
 * @param id User ID
 * @param amount Balance amount
 * @param action Action type (increase/decrease)
 * @returns Promise with updated user information
 */
export function apiUpdateUserAmount(
    id: string,
    amount: number,
    action: ActionValueType,
): Promise<UserInfo> {
    return useConsolePost(`/users/change-balance/${id}`, { amount, action });
}
