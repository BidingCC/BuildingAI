/**
 * @fileoverview Console API service functions for order and recharge management
 * @description This file contains API functions for order management, recharge operations,
 * refund processing, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * Order list parameters interface
 * @description Parameters for querying order list with filters
 */
export interface OrderListParams {
    /** User information keyword */
    keyword?: string;
    /** Order number */
    orderNo?: string;
    /** Payment method */
    payType?: string;
    /** Refund status: 1-refunded, 0-not refunded */
    refundStatus?: string;
    /** Page number */
    page?: number;
    /** Page size */
    pageSize?: number;
    /** Payment status */
    payStatus?: string;
}

/**
 * Order list interface
 * @description Interface for paginated order list response
 */
export interface OrderList {
    /** Order items */
    items: OrderListItem[];
    /** Current page number */
    page: number;
    /** Page size */
    pageSize: number;
    /** Payment method lists */
    payTypeLists: string;
    /** Statistics data */
    statistics: Statistics;
    /** Total count */
    total: number;
    /** Total pages */
    totalPages: number;
}

/**
 * Order list item interface
 * @description Interface for individual order item in the list
 */
export interface OrderListItem {
    /** Creation time */
    createdAt?: string;
    /** Gift power amount */
    givePower?: number;
    /** Order ID */
    id?: string;
    /** Order number */
    orderNo?: string;
    /** Order amount */
    orderAmount?: string;
    /** Payment status: 1-paid, 0-unpaid */
    payStatus?: number;
    /** Payment status description */
    payStatusDesc?: string;
    /** Payment time */
    payTime?: null;
    /** Payment type */
    payType?: number;
    /** Payment method description */
    payTypeDesc?: string;
    /** Recharge power amount */
    power?: number;
    /** Refund status: 1-refunded, 0-not refunded */
    refundStatus?: number;
    /** Total power amount */
    totalPower?: number;
    /** User information */
    user?: User;
}

/**
 * User information interface
 * @description Interface for user basic information
 */
export interface User {
    /** User avatar */
    avatar: string;
    /** Username */
    username: string;
}

/**
 * Statistics interface
 * @description Interface for order statistics data
 */
export interface Statistics {
    /** Total recharge amount */
    totalAmount: number;
    /** Net income */
    totalIncome: number;
    /** Total order count */
    totalOrder: number;
    /** Total refund amount */
    totalRefundAmount: number;
    /** Total refund order count */
    totalRefundOrder: number;
}

/**
 * Order detail data interface
 * @description Interface for detailed order information
 */
export interface OrderDetailData {
    /** Creation time */
    createdAt: string;
    /** Gift power amount */
    givePower: number;
    /** Order ID */
    id: string;
    /** Order amount */
    orderAmount: string;
    /** Order number */
    orderNo: string;
    /** Order status */
    orderType: string;
    /** Order source description */
    terminalDesc?: string;
    /** Refund number */
    refundNo?: string;
    /** Payment status */
    payStatus: number;
    /** Payment time */
    payTime: string;
    /** Payment type */
    payType: number;
    /** Payment method description */
    payTypeDesc: string;
    /** Recharge power amount */
    power: number;
    /** Refund status */
    refundStatus: number;
    /** Refund status description */
    refundStatusDesc: string;
    /** Total recharge power amount */
    totalPower: number;
    /** User information */
    user: User;
}

// ==================== Order and Recharge Related APIs ====================

/**
 * Get order list
 * @description Get paginated order list with filters
 * @param params Query parameters
 * @returns Promise with order list data
 */
export const apiGetOrderList = (params: OrderListParams): Promise<OrderList> => {
    return useConsoleGet("/recharge-order", params);
};

/**
 * Get order detail
 * @description Get detailed order information by order ID
 * @param id Order ID
 * @returns Promise with order detail data
 */
export const apiGetOrderDetail = (id: string): Promise<OrderDetailData> => {
    return useConsoleGet("/recharge-order/" + id);
};

/**
 * Process refund
 * @description Process refund for specified order
 * @param id Order ID
 * @returns Promise with operation result
 */
export const apiRefund = (id: string): Promise<void> => {
    return useConsolePost("/recharge-order/refund", { id });
};
