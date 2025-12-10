/**
 * @fileoverview Web API service functions for recharge center management
 * @description This file contains API functions for recharge center operations,
 * payment processing, order management, and related type definitions for the web interface.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Recharge center information interface
 * @description Interface for recharge center response data
 */
export interface RechargeCenterInfo {
    /** Payment method list */
    payWayList: PayWayList[];
    /** Recharge explanation */
    rechargeExplain: string;
    /** Recharge rules */
    rechargeRule: RechargeRule[];
    /** Recharge switch status */
    rechargeStatus: boolean;
    /** User information */
    user: User;
}

/**
 * Payment method interface
 * @description Interface for payment method information
 */
export interface PayWayList {
    /** Payment method logo */
    logo: string;
    /** Payment provider name */
    name: string;
    /** Payment type */
    payType: number;
}

/**
 * Recharge rule interface
 * @description Interface for recharge rule configuration
 */
export interface RechargeRule extends BaseEntity {
    /** Gift power amount */
    givePower: number;
    /** Rule label */
    label: string;
    /** Recharge power amount */
    power: number;
    /** Selling price */
    sellPrice: string;
}

/**
 * User information interface
 * @description Interface for user basic information
 */
export interface User extends BaseEntity {
    /** User avatar */
    avatar: string;
    /** User power */
    power: number;
    /** Username */
    username: string;
}

/**
 * Order submission parameters interface
 * @description Parameters for submitting recharge order
 */
export interface OrderParams {
    /** Recharge rule ID */
    id: string;
    /** Payment method */
    payType: number;
}

/**
 * Order information interface
 * @description Interface for order information response
 */
export interface OrderInfo extends BaseEntity {
    /** Order ID */
    orderId: string;
    /** Order amount */
    orderAmount: string;
    /** Order number */
    orderNo: string;
}

/**
 * Prepaid parameters interface
 * @description Parameters for prepaid payment
 */
export interface PrepaidParams {
    /** Order source: recharge-recharge order */
    from: string;
    /** Order ID */
    orderId: string;
    /** Payment method */
    payType: number;
}

/**
 * Prepaid information interface
 * @description Interface for prepaid payment response
 */
export interface PrepaidInfo {
    /** Payment method */
    payType: number;
    /** Payment QR code (base64 format) */
    qrCode: QrCode;
}

/**
 * QR code interface
 * @description Interface for QR code information
 */
export interface QrCode {
    /** QR code URL */
    code_url: string;
}

/**
 * Payment result interface
 * @description Interface for payment result response
 */
export interface PayResult extends BaseEntity {
    /** Order number */
    orderNo: string;
    /** Payment status: 0-unpaid, 1-paid */
    payStatus: number;
}

// ==================== Recharge Center Related APIs ====================

/**
 * Get recharge center information
 * @description Get recharge center configuration and user information
 * @returns Promise with recharge center information
 */
export const apiGetRechargeCenterInfo = (): Promise<RechargeCenterInfo> => {
    return useWebGet("/recharge/center");
};

/**
 * Submit recharge order
 * @description Submit a recharge order with selected rule and payment method
 * @param data Order parameters
 * @returns Promise with order information
 */
export const apiPostRecharge = (data: OrderParams): Promise<OrderInfo> => {
    return useWebPost("/recharge/submitRecharge", data);
};

/**
 * Process prepaid payment
 * @description Process prepaid payment and get QR code
 * @param data Prepaid parameters
 * @returns Promise with prepaid information
 */
export const apiPostPrepaid = (data: PrepaidParams): Promise<PrepaidInfo> => {
    return useWebPost("/pay/prepay", data);
};

/**
 * Get payment result
 * @description Get payment result for an order
 * @param params Query parameters
 * @returns Promise with payment result
 */
export const apiGetPayResult = (params: { orderId?: string; from: string }): Promise<PayResult> => {
    return useWebGet("/pay/getPayResult", params);
};
