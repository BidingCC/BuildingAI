/**
 * @fileoverview Web API service functions for power detail management
 * @description This file contains API functions for power detail queries,
 * account log management, and related type definitions for the web interface.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity, BaseQueryParams, PaginationResult } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Power detail data interface
 * @description Interface for power detail response data
 */
export interface PowerDetailData extends PaginationResult<PowerDetailItem> {
    /** User information */
    userInfo: UserInfo;
}

/**
 * Power detail item interface
 * @description Interface for individual power detail item
 */
export interface PowerDetailItem extends BaseEntity {
    /** Account number */
    accountNo: string;
    /** Account type */
    accountType: number;
    /** Change description */
    accountTypeDesc: string;
    /** Change type: 1-increase, 0-decrease */
    action: number;
    /** Association number */
    associationNo: string;
    /** Association user ID */
    associationUserId: null;
    /** Change amount */
    changeAmount: number;
    /** Consumption source description (agent/app) */
    consumeSourceDesc: string;
    /** Remaining amount */
    leftAmount: number;
    /** Remark */
    remark: string;
    /** User ID */
    userId: string;
}

/**
 * User information interface
 * @description Interface for user power information
 */
export interface UserInfo {
    /** Remaining power (gift power is fixed at 0) */
    power: number;
}

/**
 * Power detail query parameters interface
 * @description Parameters for querying power detail list
 */
export interface PowerDetailQueryParams extends BaseQueryParams {
    /** Action type filter */
    action?: string;
}

// ==================== Power Detail Related APIs ====================

/**
 * Get power detail list
 * @description Get paginated list of power detail records
 * @param params Query parameters
 * @returns Promise with power detail data
 */
export function apiGetPowerDetailList(params?: PowerDetailQueryParams): Promise<PowerDetailData> {
    return useWebGet("/user/account-log", params);
}
