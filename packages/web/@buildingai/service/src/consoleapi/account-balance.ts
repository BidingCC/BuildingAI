/**
 * @fileoverview Console API service functions for account balance management
 * @description This file contains API functions for account balance operations,
 * balance history tracking, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * Account balance action enumeration
 * @description Actions that can be performed on account balance
 */
export enum ACTION {
    /** Decrease balance */
    DEC = 0,
    /** Increase balance */
    INC = 1,
}

/**
 * Account balance action value type
 * @description Type for action values
 */
export type ActionValueType = (typeof ACTION)[keyof typeof ACTION];

/**
 * Account balance interface
 * @description Interface for account balance data with pagination
 */
export interface AccountBalance {
    /** Account type lists */
    accountTypeLists: AccountType;
    /** Balance list items */
    items: AccountBalanceListItem[];
    /** Current page number */
    page: number;
    /** Page size */
    pageSize: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
}

/**
 * Account type interface
 * @description Interface for account type mappings
 */
export interface AccountType {
    /** Account type 100 */
    "100": string;
    /** Account type 101 */
    "101": string;
    /** Account type 102 */
    "102": string;
}

/**
 * Account balance list item interface
 * @description Interface for individual account balance list items
 */
export interface AccountBalanceListItem {
    /** Account number */
    accountNo?: string;
    /** Account type */
    accountType?: number;
    /** Account type description */
    accountTypeDesc?: string;
    /** Action type: 1-increase, 0-decrease */
    action?: number;
    /** Associated user (admin who performed the action) */
    associationUser: string;
    /** Associated user ID */
    associationUserId?: string;
    /** Change amount */
    changeAmount?: number;
    /** Creation time */
    createdAt?: string;
    /** Record ID */
    id?: string;
    /** Remaining amount */
    leftAmount?: number;
    /** Change number */
    no?: string;
    /** User information for the change */
    user?: User;
}

/**
 * User information interface for balance changes
 * @description Interface for user information in balance change records
 */
export interface User {
    /** User avatar URL */
    avatar: string;
    /** Username */
    username: string;
    /** User number */
    userNo: string;
    /** User nickname */
    nickname: string;
}

// ==================== Account Balance Related APIs ====================

/**
 * Get account balance list
 * @description Get paginated account balance list with filtering options
 * @param params Query parameters
 * @param params.page Page number
 * @param params.pageSize Page size
 * @param params.accountType Account type filter
 * @param params.keyword Search keyword
 * @returns Promise with account balance list
 */
export const getAccountBalanceList = (params: {
    page?: number;
    pageSize?: number;
    accountType?: string;
    keyword?: string;
}): Promise<AccountBalance> => {
    return useConsoleGet("/finance/account-log", params);
};
