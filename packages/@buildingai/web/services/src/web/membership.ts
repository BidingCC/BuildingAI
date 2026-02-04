import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

/** 支付方式：1 微信 2 支付宝 */
export type PayConfigType = 1 | 2;

export type BenefitItem = { icon?: string; content?: string };

export type MembershipLevel = {
    id: string;
    name: string;
    icon: string | null;
    level: number;
    givePower: number;
    benefits: string | BenefitItem[] | null;
    description: string | null;
};

export type BillingItem = {
    levelId: string;
    level: MembershipLevel | null;
    originalPrice?: number;
    salesPrice?: number;
    status?: boolean;
    label: string;
};

export type MembershipPlan = {
    id: string;
    name: string;
    label: string | null;
    durationConfig: number;
    duration: { value?: number; unit?: string } | null;
    status: boolean;
    sort: number;
    billing: BillingItem[] | null;
};

export type PayWayItem = {
    name: string;
    payType: number;
    logo: string | null;
};

export type MembershipCenterResponse = {
    user: {
        id: string;
        userNo?: string;
        username?: string;
        avatar?: string | null;
        power?: number;
    } | null;
    membershipStatus: boolean;
    userSubscription: {
        id: string;
        level: MembershipLevel | null;
        startTime: string;
        endTime: string;
    } | null;
    plans: MembershipPlan[];
    payWayList: PayWayItem[];
};

export type SubmitOrderParams = {
    planId: string;
    levelId: string;
    payType: PayConfigType;
};

export type SubmitOrderResponse = {
    orderId: string;
    orderNo: string;
    orderAmount: number;
};

export type PrepayParams = {
    orderId: string;
    payType: PayConfigType;
    from: "membership" | "recharge" | "order";
};

export type PrepayResponse = {
    qrCode: string;
    payType: number;
};

export type UserSubscriptionItem = {
    id: string;
    level: MembershipLevel | null;
    startTime: string;
    endTime: string;
    source: number;
    sourceDesc: string;
    duration: string | null;
    refundStatus: number;
    isExpired: boolean;
    isActive: boolean;
    createdAt: string;
};

export type UserSubscriptionsResponse = {
    items: UserSubscriptionItem[];
    total: number;
    page: number;
    pageSize: number;
};

export function useUserSubscriptionsQuery(
    params?: { page?: number; pageSize?: number },
    options?: QueryOptionsUtil<UserSubscriptionsResponse>,
) {
    return useQuery<UserSubscriptionsResponse>({
        queryKey: ["membership", "subscriptions", params],
        queryFn: () =>
            apiHttpClient.get<UserSubscriptionsResponse>("/membership/subscriptions", { params }),
        ...options,
    });
}

export function useMembershipCenterQuery(
    params?: { id?: string },
    options?: QueryOptionsUtil<MembershipCenterResponse>,
) {
    return useQuery<MembershipCenterResponse>({
        queryKey: ["membership", "center", params],
        queryFn: () =>
            apiHttpClient.get<MembershipCenterResponse>("/membership/center", { params }),
        ...options,
    });
}

export function useMembershipSubmitOrderMutation(
    options?: MutationOptionsUtil<SubmitOrderResponse, SubmitOrderParams>,
) {
    return useMutation<SubmitOrderResponse, Error, SubmitOrderParams>({
        mutationFn: (body) =>
            apiHttpClient.post<SubmitOrderResponse>("/membership/submitOrder", body),
        ...options,
    });
}

export function usePayPrepayMutation(options?: MutationOptionsUtil<PrepayResponse, PrepayParams>) {
    return useMutation<PrepayResponse, Error, PrepayParams>({
        mutationFn: (body) => apiHttpClient.post<PrepayResponse>("/pay/prepay", body),
        ...options,
    });
}

export type UserMembershipOrderItem = {
    id: string;
    orderNo: string;
    planName: string;
    levelName: string;
    duration: string;
    orderAmount: number;
    payType: PayConfigType;
    payTypeDesc: string;
    refundStatus: number;
    createdAt: string;
    source: number;
    sourceDesc: string;
    levelSnap?: {
        id: string;
        name: string;
        icon?: string | null;
        level: number;
    };
};

export type UserMembershipOrdersResponse = {
    items: UserMembershipOrderItem[];
    total: number;
    page: number;
    pageSize: number;
};

export function useMembershipOrderListsQuery(
    params?: { page?: number; pageSize?: number },
    options?: QueryOptionsUtil<UserMembershipOrdersResponse>,
) {
    return useQuery<UserMembershipOrdersResponse>({
        queryKey: ["membership", "order", "lists", params],
        queryFn: () =>
            apiHttpClient.get<UserMembershipOrdersResponse>("/membership/order/lists", { params }),
        ...options,
    });
}

export function useMembershipOrderListsInfiniteQuery(
    params?: { levelId?: string },
    options?: { enabled?: boolean },
) {
    const pageSize = 15;
    const result = useInfiniteQuery<UserMembershipOrdersResponse>({
        queryKey: ["membership", "order", "lists", "infinite", pageSize, params?.levelId],
        queryFn: ({ pageParam }) =>
            apiHttpClient.get<UserMembershipOrdersResponse>("/membership/order/lists", {
                params: { page: pageParam as number, pageSize, levelId: params?.levelId },
            }),
        getNextPageParam: (lastPage) => {
            const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
            if (lastPage.page >= totalPages) return undefined;
            return lastPage.page + 1;
        },
        initialPageParam: 1,
        enabled: options?.enabled !== false,
        ...options,
    });
    const items = result.data?.pages.flatMap((p) => p.items) ?? [];
    return { ...result, items };
}
