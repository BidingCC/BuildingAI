/**
 * @fileoverview Console API service functions for membership order management
 * @description This file contains API functions for membership order queries,
 * refund operations, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { PaginationResult } from "../models/globals";

/**
 * 会员订单用户信息
 */
export interface MembershipOrderUser {
    nickname: string;
    avatar: string;
}

/**
 * 会员订单列表项
 */
export interface MembershipOrderListItem {
    id: string;
    orderNo: string;
    payType: number;
    payState: number;
    refundStatus: number;
    plan: Record<string, any>;
    level: Record<string, any>;
    totalAmount: number;
    duration: string;
    payTime: string;
    createdAt: string;
    orderAmount: number;
    user: MembershipOrderUser;
    payTypeDesc: string;
    payStateDesc: string;
    refundStateDesc: string;
}

/**
 * 会员订单详情
 */
export interface MembershipOrderDetailData extends MembershipOrderListItem {
    orderType: string;
    refundStatusDesc: string;
    terminalDesc: string;
    refundNo: string;
}

/**
 * 会员订单统计数据
 */
export interface MembershipOrderStatistics {
    totalOrder: number;
    totalAmount: number;
    totalRefundOrder: number;
    totalRefundAmount: number;
    totalIncome: number;
}

/**
 * 支付方式列表项
 */
export interface PayTypeItem {
    name: string;
    payType: string;
}

/**
 * 会员订单列表扩展数据
 */
export interface MembershipOrderExtend {
    statistics: MembershipOrderStatistics;
    payTypeLists: PayTypeItem[];
}

/**
 * 会员订单查询参数
 */
export interface MembershipOrderQueryParams {
    page?: number;
    pageSize?: number;
    orderNo?: string;
    userKeyword?: string;
    startTime?: string;
    endTime?: string;
    payType?: number;
    payState?: number;
    refundState?: number;
}

/**
 * 会员订单列表响应
 */
export type MembershipOrderListResponse = PaginationResult<MembershipOrderListItem> & {
    extend: MembershipOrderExtend;
};

/**
 * 获取会员订单列表
 * @param params 查询参数
 * @returns Promise with order list
 */
export const apiGetMembershipOrderList = (
    params: MembershipOrderQueryParams,
): Promise<MembershipOrderListResponse> => {
    return useConsoleGet("/membership-order", params);
};

/**
 * 获取会员订单详情
 * @param id 订单ID
 * @returns Promise with order detail
 */
export const apiGetMembershipOrderDetail = (id: string): Promise<MembershipOrderDetailData> => {
    return useConsoleGet(`/membership-order/${id}`);
};

/**
 * 会员订单退款
 * @param id 订单ID
 * @returns Promise with refund result
 */
export const apiMembershipOrderRefund = (id: string): Promise<{ message: string }> => {
    return useConsolePost("/membership-order/refund", { id });
};

/**
 * Create system adjustment order
 * @description Create a system adjustment order for membership level adjustment
 * @param data System adjustment order data
 * @returns Promise with created order information
 */
export const apiCreateSystemAdjustmentOrder = (data: {
    userId: string;
    levelId: string | null;
    durationType: "1" | "3" | "12" | "forever" | "custom";
    customValue?: number;
    customUnit?: "day" | "month" | "year";
}): Promise<{ orderId: string; orderNo: string; message: string }> => {
    return useConsolePost("/membership-order/system-adjustment", data);
};
