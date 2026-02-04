import { useAuthStore } from "@buildingai/stores";
import type { MutationOptionsUtil, UserInfo } from "@buildingai/web-types";
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type AllowedUserField =
    | "nickname"
    | "email"
    | "phone"
    | "avatar"
    | "bio"
    | "gender"
    | "realName";

export type UpdateUserFieldRequest = {
    field: AllowedUserField;
    value: string;
};

export type UpdateUserFieldResponse = {
    user: UserInfo;
    message: string;
};

export type UserAccountLogItem = {
    id: string;
    accountNo: string;
    accountType: number;
    accountTypeDesc?: string;
    action: number;
    changeAmount: number;
    leftAmount: number;
    associationNo?: string | null;
    sourceInfo?: { type?: number; source?: string } | null;
    consumeSourceDesc?: string;
    remark?: string | null;
    expireAt?: string | null;
    availableAmount?: number;
    createdAt: string;
};

export type UserAccountLogExtend = {
    power: number;
    membershipGiftPower: number;
    rechargePower: number;
};

export type UserAccountLogResponse = {
    items: UserAccountLogItem[];
    total: number;
    page: number;
    pageSize: number;
    extend: UserAccountLogExtend;
};

export function useUserAccountLogQuery(
    params?: { page?: number; pageSize?: number; action?: string },
    options?: { enabled?: boolean },
): UseQueryResult<UserAccountLogResponse, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<UserAccountLogResponse>({
        queryKey: ["user", "account-log", params],
        queryFn: () => apiHttpClient.get<UserAccountLogResponse>("/user/account-log", { params }),
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useUserAccountLogInfiniteQuery(
    params?: { action?: string },
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<UserAccountLogResponse>, unknown> & {
    items: UserAccountLogItem[];
    extend: UserAccountLogExtend | null;
} {
    const { isLogin } = useAuthStore((state) => state.authActions);
    const pageSize = 15;
    const result = useInfiniteQuery<UserAccountLogResponse>({
        queryKey: ["user", "account-log", "infinite", pageSize, params?.action ?? ""],
        queryFn: ({ pageParam }) =>
            apiHttpClient.get<UserAccountLogResponse>("/user/account-log", {
                params: {
                    page: pageParam as number,
                    pageSize,
                    action: params?.action,
                },
            }),
        getNextPageParam: (lastPage) => {
            const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
            if (lastPage.page >= totalPages) return undefined;
            return lastPage.page + 1;
        },
        initialPageParam: 1,
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });

    const items = result.data?.pages.flatMap((p) => p.items) ?? [];
    const extend = result.data?.pages?.[0]?.extend ?? null;
    return { ...result, items, extend };
}

/**
 * Update user field mutation hook.
 */
export function useUpdateUserFieldMutation(
    options?: MutationOptionsUtil<UpdateUserFieldResponse, UpdateUserFieldRequest>,
) {
    const queryClient = useQueryClient();

    return useMutation<UpdateUserFieldResponse, Error, UpdateUserFieldRequest>({
        mutationFn: (data) =>
            apiHttpClient.patch<UpdateUserFieldResponse>("/user/update-field", data),
        ...options,
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: ["user", "info"] });
            options?.onSuccess?.(...args);
        },
    });
}
