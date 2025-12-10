/**
 * @fileoverview Console API service functions for common operations
 * @description This file contains API functions for common console operations,
 * user information management, and shared utilities.
 *
 * @author BuildingAI Teams
 */

import type { DashboardData } from "@buildingai/types";

import type { UserInfo } from "../webapi/user";
import type { MenuFormData } from "./menu";

// ==================== Type Definitions ====================

/**
 * Console user information response interface
 * @description Interface for console user information response with permissions and menus
 */
export interface ConsoleUserInfo {
    /** User menu permissions */
    menus?: MenuFormData[];
    /** User permission list */
    permissions?: string[];
    /** User basic information */
    user?: UserInfo;
}

// ==================== Dashboard Related APIs ====================

/**
 * Get dashboard data
 * @description Get dashboard statistics data including user stats, agent stats, chat stats, order stats, user detail, revenue detail, token usage and extension data
 * @param params Query parameters
 * @param params.userDays User chart time range in days
 * @param params.revenueDays Revenue chart time range in days
 * @param params.tokenDays Token usage ranking time range in days
 * @returns Promise with dashboard data
 */
export function apiGetDashboard(params?: {
    userDays?: number;
    revenueDays?: number;
    tokenDays?: number;
}): Promise<DashboardData> {
    return useConsoleGet<DashboardData>("/analyse/dashboard", params);
}

// ==================== User Information Related APIs ====================

/**
 * Get user information
 * @description Get complete information of current logged-in user, including basic info, menu permissions and permission list
 * @returns Promise with user information data
 */
export function apiGetUserInfo(): Promise<ConsoleUserInfo> {
    return useConsoleGet<ConsoleUserInfo>("/users/info");
}
