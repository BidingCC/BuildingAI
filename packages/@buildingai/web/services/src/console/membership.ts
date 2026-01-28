import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Order types
export type MembershipOrderListItem = {
    id: string;
    orderNo: string;
    user: {
        id: string;
        username: string;
        nickname: string | null;
        avatar: string | null;
    } | null;
    plan: {
        id: string;
        name: string;
        label: string | null;
    } | null;
    level: {
        id: string;
        name: string;
        level: number;
        icon: string | null;
    } | null;
    duration: string;
    orderAmount: number;
    totalAmount: number;
    payType: string;
    payTypeDesc: string;
    payState: number;
    payStateDesc: string;
    refundStatus: number;
    refundStateDesc: string;
    createdAt: string;
};

export type MembershipOrderDetailData = {
    id: string;
    orderNo: string;
    orderType: string;
    user: {
        id: string;
        username: string;
        nickname: string | null;
        avatar: string | null;
    } | null;
    planSnap: Record<string, any>;
    levelSnap: Record<string, any>;
    duration: string;
    orderAmount: number;
    totalAmount: number;
    terminalDesc: string;
    refundNo: string | null;
    refundStatusDesc: string;
    payType: string;
    payTypeDesc: string;
    payState: number;
    refundStatus: number;
    payTime: string | null;
    createdAt: string;
};

export type MembershipStatistics = {
    totalOrder: number;
    totalAmount: number;
    totalRefundOrder: number;
    totalRefundAmount: number;
    totalIncome: number;
};

export type QueryMembershipOrderDto = {
    page?: number;
    pageSize?: number;
    userKeyword?: string;
    orderNo?: string;
    payType?: string;
    payState?: string;
    refundState?: string;
    startTime?: string;
    endTime?: string;
};

export type MembershipOrderListResponse = PaginatedResponse<MembershipOrderListItem> & {
    extend?: {
        statistics: MembershipStatistics;
        payTypeLists: Array<{ name: string; payType: string }>;
    };
};

/**
 * Get membership order list
 */
export function useMembershipOrderListQuery(
    params?: QueryMembershipOrderDto,
    options?: PaginatedQueryOptionsUtil<MembershipOrderListItem>,
) {
    return useQuery<MembershipOrderListResponse>({
        queryKey: ["membership-order", "list", params],
        queryFn: () =>
            consoleHttpClient.get<MembershipOrderListResponse>("/membership-order", { params }),
        ...options,
    });
}

/**
 * Get membership order detail
 */
export function useMembershipOrderDetailQuery(
    id: string,
    options?: QueryOptionsUtil<MembershipOrderDetailData>,
) {
    return useQuery<MembershipOrderDetailData>({
        queryKey: ["membership-order", "detail", id],
        queryFn: () => consoleHttpClient.get<MembershipOrderDetailData>(`/membership-order/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * Refund membership order
 */
export function useRefundMembershipOrderMutation(
    options?: MutationOptionsUtil<{ message: string }, string>,
) {
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<{ message: string }>("/membership-order/refund", { id }),
        ...options,
    });
}
