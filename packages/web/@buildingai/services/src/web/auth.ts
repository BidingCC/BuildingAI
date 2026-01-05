import { type UserTerminalType } from "@buildingai/constants/shared";
import type { UserInfo } from "@buildingai/web-types";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

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

/**
 * Login mutation hook.
 * Use this for user-triggered login actions.
 */
export function useLoginMutation(
    data: LoginRequest,
    options?: Omit<UseMutationOptions<LoginResponse, Error, LoginRequest>, "mutationFn">,
) {
    return useMutation<LoginResponse, Error, LoginRequest>({
        mutationFn: () => apiHttpClient.post<LoginResponse>("/auth/login", data),
        ...options,
    });
}

/**
 * Check account mutation hook.
 * Use this when you need to check account on-demand (e.g., form validation).
 */
export function useCheckAccountMutation(
    data: CheckAccountRequest,
    options?: Omit<
        UseMutationOptions<CheckAccountResponse, Error, CheckAccountRequest>,
        "mutationFn"
    >,
) {
    return useMutation<CheckAccountResponse, Error, CheckAccountRequest>({
        mutationFn: () => apiHttpClient.post<CheckAccountResponse>("/auth/check-account", data),
        ...options,
    });
}
