import { type UserTerminalType } from "@buildingai/constants/shared";
import type { UserInfo } from "@buildingai/web-types";
import {
    useMutation,
    type UseMutationOptions,
    useQuery,
    type UseQueryOptions,
} from "@tanstack/react-query";

import { apiHttpClient } from "../base";

// ============================================================================
// Types
// ============================================================================

export type LoginRequest = {
    username: string;
    password: string;
    terminal: UserTerminalType;
};

export type LoginResponse = {
    token: string;
    user: UserInfo;
    expiresAt: string;
};

export type CheckAccountRequest = {
    account: string;
};

export type CheckAccountResponse = {
    hasAccount: boolean;
    type: string;
};

// ============================================================================
// API Functions (Layer 1 - Pure functions, can be used standalone)
// ============================================================================

export function postLogin(data: LoginRequest) {
    return apiHttpClient.post<LoginResponse>("/auth/login", data);
}

export function postCheckAccount(data: CheckAccountRequest) {
    return apiHttpClient.post<CheckAccountResponse>("/auth/check-account", data);
}

// ============================================================================
// React Query Hooks (Layer 2 - Optional wrappers with full customization)
// ============================================================================

/**
 * Login mutation hook.
 * Use this for user-triggered login actions.
 */
export function useLoginMutation(
    options?: Omit<UseMutationOptions<LoginResponse, Error, LoginRequest>, "mutationFn">,
) {
    return useMutation<LoginResponse, Error, LoginRequest>({
        mutationFn: postLogin,
        ...options,
    });
}

/**
 * Check account query hook.
 * Use this when you need to check if an account exists with caching.
 */
export function useCheckAccountQuery(
    data: CheckAccountRequest,
    options?: Omit<UseQueryOptions<CheckAccountResponse>, "queryKey" | "queryFn">,
) {
    return useQuery<CheckAccountResponse>({
        queryKey: ["auth", "check-account", data.account],
        queryFn: () => postCheckAccount(data),
        ...options,
    });
}

/**
 * Check account mutation hook.
 * Use this when you need to check account on-demand (e.g., form validation).
 */
export function useCheckAccountMutation(
    options?: Omit<
        UseMutationOptions<CheckAccountResponse, Error, CheckAccountRequest>,
        "mutationFn"
    >,
) {
    return useMutation<CheckAccountResponse, Error, CheckAccountRequest>({
        mutationFn: postCheckAccount,
        ...options,
    });
}
