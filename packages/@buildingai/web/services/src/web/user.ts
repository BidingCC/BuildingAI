import { useAuthStore } from "@buildingai/stores";
import type { UserInfo } from "@buildingai/web-types";
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

/**
 * 发送绑定手机号验证码请求参数
 */
export type SendBindPhoneCodeRequest = {
    mobile: string;
    areaCode?: string;
};

/**
 * 绑定手机号请求参数
 */
export type BindPhoneRequest = {
    mobile: string;
    code: string;
    areaCode?: string;
};

/**
 * 发送绑定验证码响应
 */
export type SendBindPhoneCodeResponse = string;

/**
 * 绑定手机号响应
 */
export type BindPhoneResponse = UpdateUserFieldResponse;

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
    dailyGift: number;
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
export function useUpdateUserFieldMutation(options?: any) {
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

/**
 * 发送手机号绑定验证码
 */
export function useSendBindPhoneCodeMutation(options?: any) {
    return useMutation<SendBindPhoneCodeResponse, Error, SendBindPhoneCodeRequest>({
        mutationFn: (data) =>
            apiHttpClient.post<SendBindPhoneCodeResponse>("/user/phone/send-code", data),
        ...options,
    });
}

/**
 * 手机号绑定
 */
export function useBindPhoneMutation(options?: any) {
    const queryClient = useQueryClient();

    return useMutation<BindPhoneResponse, Error, BindPhoneRequest>({
        mutationFn: (data) => apiHttpClient.post<BindPhoneResponse>("/user/phone/bind", data),
        ...options,
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: ["user", "info"] });
            options?.onSuccess?.(...args);
        },
    });
}

/**
 * 用户存储容量信息
 */
export type UserStorageInfo = {
    totalStorage: number;
    usedStorage: number;
    remainingStorage: number;
    usagePercent: number;
    membershipActive: boolean;
    baseStorage: number;
    membershipExtraStorage: number;
};

/**
 * 获取用户存储容量信息
 */
export function useUserStorageQuery(options?: {
    enabled?: boolean;
}): UseQueryResult<UserStorageInfo, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<UserStorageInfo>({
        queryKey: ["user", "storage"],
        queryFn: () => apiHttpClient.get<UserStorageInfo>("/user/storage"),
        enabled: isLogin() && options?.enabled !== false,
        refetchOnWindowFocus: true,
        staleTime: 10000,
        ...options,
    });
}
