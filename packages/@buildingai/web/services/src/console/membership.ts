import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Level types
export type MembershipLevelListItem = {
    id: string;
    name: string;
    level: number;
    icon: string | null;
    description: string | null;
    givePower: number;
    status: boolean;
    accountCount?: number;
    benefits?: { icon?: string; content?: string }[];
};

export type QueryLevelsDto = {
    page?: number;
    pageSize?: number;
    name?: string;
    /** Query param: "true" | "false" (backend transforms to boolean) */
    status?: string;
};

export type CreateLevelsDto = {
    name: string;
    level: number;
    icon?: string;
    givePower?: number;
    description?: string;
    benefits?: { icon?: string; content?: string }[];
};

export type UpdateLevelsDto = Partial<CreateLevelsDto> & {
    status?: boolean;
};

export type MembershipLevelListResponse = PaginatedResponse<MembershipLevelListItem>;

/**
 * Get membership level list (paginated)
 */
export function useMembershipLevelListQuery(
    params?: QueryLevelsDto,
    options?: PaginatedQueryOptionsUtil<MembershipLevelListItem>,
) {
    return useQuery<MembershipLevelListResponse>({
        queryKey: ["membership-levels", "list", params],
        queryFn: () => consoleHttpClient.get<MembershipLevelListResponse>("/levels", { params }),
        ...options,
    });
}

/**
 * Create membership level
 */
export function useCreateMembershipLevelMutation(
    options?: MutationOptionsUtil<MembershipLevelListItem, CreateLevelsDto>,
) {
    const queryClient = useQueryClient();
    return useMutation<MembershipLevelListItem, Error, CreateLevelsDto>({
        mutationFn: (body) => consoleHttpClient.post<MembershipLevelListItem>("/levels", body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["membership-levels"] });
        },
        ...options,
    });
}

/**
 * Update membership level
 */
export function useUpdateMembershipLevelMutation(
    options?: MutationOptionsUtil<MembershipLevelListItem, { id: string; body: UpdateLevelsDto }>,
) {
    const queryClient = useQueryClient();
    return useMutation<MembershipLevelListItem, Error, { id: string; body: UpdateLevelsDto }>({
        mutationFn: ({ id, body }) =>
            consoleHttpClient.patch<MembershipLevelListItem>(`/levels/${id}`, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["membership-levels"] });
        },
        ...options,
    });
}

/**
 * Delete membership level
 */
export function useDeleteMembershipLevelMutation(
    options?: MutationOptionsUtil<{ message?: string }, string>,
) {
    const queryClient = useQueryClient();
    return useMutation<{ message?: string }, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<{ message?: string }>(`/levels/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["membership-levels"] });
        },
        ...options,
    });
}

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

// Plan config types (GET /plans returns plansStatus + plans)
export type MembershipPlanConfigItem = {
    id: string;
    name: string;
    label?: string | null;
    durationConfig: number;
    duration?: { value?: number; unit?: string };
    status: boolean;
    sort: number;
    levelCount: number;
    levels: Array<{ id: string; name: string; level?: number; icon?: string | null } | null>;
};

export type MembershipPlansConfigResponse = {
    plansStatus: boolean;
    plans: MembershipPlanConfigItem[];
};

/**
 * Get membership plans config (list all plans with level count)
 */
export function useMembershipPlansConfigQuery(
    options?: QueryOptionsUtil<MembershipPlansConfigResponse>,
) {
    return useQuery<MembershipPlansConfigResponse>({
        queryKey: ["membership-plans", "config"],
        queryFn: () => consoleHttpClient.get<MembershipPlansConfigResponse>("/plans"),
        ...options,
    });
}

export type SetPlansDto = { status: boolean };

/**
 * Set single plan status (enable/disable)
 */
export function useSetMembershipPlanStatusMutation(
    options?: MutationOptionsUtil<MembershipPlanConfigItem, { id: string; status: boolean }>,
) {
    const queryClient = useQueryClient();
    return useMutation<MembershipPlanConfigItem, Error, { id: string; status: boolean }>({
        mutationFn: ({ id, status }) =>
            consoleHttpClient.post<MembershipPlanConfigItem>(`/plans/setPlanStatus/${id}`, {
                status,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
        },
        ...options,
    });
}

/**
 * Update plan sort
 */
export function useUpdateMembershipPlanSortMutation(
    options?: MutationOptionsUtil<MembershipPlanConfigItem, { id: string; sort: number }>,
) {
    const queryClient = useQueryClient();
    return useMutation<MembershipPlanConfigItem, Error, { id: string; sort: number }>({
        mutationFn: ({ id, sort }) =>
            consoleHttpClient.patch<MembershipPlanConfigItem>(`/plans/setPlanSort/${id}`, {
                sort,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
        },
        ...options,
    });
}

/**
 * Delete membership plan
 */
export function useDeleteMembershipPlanMutation(
    options?: MutationOptionsUtil<{ message?: string }, string>,
) {
    const queryClient = useQueryClient();
    return useMutation<{ message?: string }, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<{ message?: string }>(`/plans/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
        },
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
