/**
 * @fileoverview Web API service functions for purchase record management
 * @description This file contains API functions for purchase record queries,
 * order history management, subscription records, and related type definitions for the web interface.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity, BaseQueryParams, PaginationResult } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Purchase record interface
 * @description Interface for purchase record response data
 */
export type PurchaseRecord = PaginationResult<PurchaseRecordItem>;

/**
 * Purchase record item interface
 * @description Interface for individual purchase record item
 */
export interface PurchaseRecordItem extends BaseEntity {
    /** Gift power amount */
    givePower?: number;
    /** Actual payment amount */
    orderAmount?: string;
    /** Order number */
    orderNo?: string;
    /** Payment method */
    payType?: number;
    /** Payment method description */
    payTypeDesc?: string;
    /** Recharge power amount */
    power?: number;
    /** Refund status: 0-no, 1-yes */
    refundStatus?: number;
    /** Total amount */
    totalAmount?: string;
    /** Actual received amount */
    totalPower?: number;
}

/**
 * Purchase record query parameters interface
 * @description Parameters for querying purchase record list
 */
export type PurchaseRecordQueryParams = BaseQueryParams;

// ==================== Purchase Record Related APIs ====================

/**
 * Get purchase record list
 * @description Get paginated list of purchase records
 * @param params Query parameters
 * @returns Promise with purchase record data
 */
export function apiPurchaseRecord(params: PurchaseRecordQueryParams): Promise<PurchaseRecord> {
    return useWebGet("/recharge/lists", params);
}

// ==================== Subscription Record Type Definitions ====================

/**
 * Subscription record interface
 * @description Interface for subscription record response data
 */
export type SubscriptionRecord = PaginationResult<SubscriptionRecordItem>;

/**
 * Subscription record item interface
 * @description Interface for individual subscription record item
 */
export interface SubscriptionRecordItem extends BaseEntity {
    /** 订单编号 */
    orderNo?: string;
    /** 订阅计划名称 */
    planName?: string;
    /** 会员等级名称 */
    levelName?: string;
    /** 订阅时长 */
    duration?: string;
    /** 实付金额 */
    orderAmount?: string;
    /** 支付方式: 1-微信, 2-支付宝 */
    payType?: number;
    /** 支付方式描述 */
    payTypeDesc?: string;
    /** 退款状态: 0-未退款, 1-已退款 */
    refundStatus?: number;
}

/**
 * Subscription record query parameters interface
 * @description Parameters for querying subscription record list
 */
export type SubscriptionRecordQueryParams = BaseQueryParams;

// ==================== Subscription Record Related APIs ====================

/**
 * Get subscription record list
 * @description Get paginated list of subscription records
 * @param params Query parameters
 * @returns Promise with subscription record data
 */
export function apiSubscriptionRecord(
    params: SubscriptionRecordQueryParams,
): Promise<SubscriptionRecord> {
    return useWebGet("/membership/order/lists", params);
}
