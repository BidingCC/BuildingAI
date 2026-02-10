import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type RechargeRule = {
    id?: string;
    power: number;
    givePower: number;
    sellPrice: number;
    label: string;
};

export type RechargeConfigData = {
    rechargeStatus: boolean;
    rechargeExplain: string;
    rechargeRule: RechargeRule[];
};

export type UpdateRechargeConfigDto = {
    rechargeStatus: boolean;
    rechargeExplain?: string;
    rechargeRule: RechargeRule[];
};

// Order types
export type OrderListItem = {
    id: string;
    orderNo: string;
    user: {
        id: string;
        username: string;
        nickname: string | null;
        avatar: string | null;
    } | null;
    power: number;
    givePower: number;
    totalPower: number;
    orderAmount: number;
    payType: string;
    payTypeDesc: string;
    payStatus: number;
    payStatusDesc: string;
    refundStatus: number;
    createdAt: string;
};

export type OrderDetailData = {
    id: string;
    orderNo: string;
    orderType: string;
    user: {
        id: string;
        username: string;
        nickname: string | null;
        avatar: string | null;
    } | null;
    power: number;
    givePower: number;
    totalPower: number;
    orderAmount: number;
    terminalDesc: string;
    refundNo: string | null;
    refundStatusDesc: string;
    payType: string;
    payTypeDesc: string;
    payStatus: number;
    paymentStatus: string;
    refundStatus: number;
    createdAt: string;
    updatedAt: string;
};

export type Statistics = {
    totalOrder: number;
    totalAmount: number;
    totalRefundOrder: number;
    totalRefundAmount: number;
    totalIncome: number;
};

export type QueryRechargeOrderDto = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    orderNo?: string;
    payType?: string;
    payStatus?: string;
    refundStatus?: string;
    startTime?: string;
    endTime?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
};

export type OrderListResponse = PaginatedResponse<OrderListItem> & {
    extend?: {
        statistics: Statistics;
        payTypeLists: Array<{ name: string; payType: string }>;
    };
};

/**
 * Get recharge config
 */
export function useRechargeConfigQuery(options?: QueryOptionsUtil<RechargeConfigData>) {
    return useQuery<RechargeConfigData>({
        queryKey: ["recharge-config"],
        queryFn: () => consoleHttpClient.get<RechargeConfigData>("/recharge-config"),
        ...options,
    });
}

/**
 * Save recharge config
 */
export function useSaveRechargeConfigMutation(
    options?: MutationOptionsUtil<RechargeConfigData, UpdateRechargeConfigDto>,
) {
    return useMutation<RechargeConfigData, Error, UpdateRechargeConfigDto>({
        mutationFn: (dto) => consoleHttpClient.post<RechargeConfigData>("/recharge-config", dto),
        ...options,
    });
}

/**
 * Get recharge order list
 */
export function useRechargeOrderListQuery(
    params?: QueryRechargeOrderDto,
    options?: PaginatedQueryOptionsUtil<OrderListItem>,
) {
    return useQuery<OrderListResponse>({
        queryKey: ["recharge-order", "list", params],
        queryFn: () => consoleHttpClient.get<OrderListResponse>("/recharge-order", { params }),
        ...options,
    });
}

/**
 * Get recharge order detail
 */
export function useRechargeOrderDetailQuery(
    id: string,
    options?: QueryOptionsUtil<OrderDetailData>,
) {
    return useQuery<OrderDetailData>({
        queryKey: ["recharge-order", "detail", id],
        queryFn: () => consoleHttpClient.get<OrderDetailData>(`/recharge-order/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * Refund recharge order
 */
export function useRefundRechargeOrderMutation(
    options?: MutationOptionsUtil<{ message: string }, string>,
) {
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<{ message: string }>("/recharge-order/refund", { id }),
        ...options,
    });
}
