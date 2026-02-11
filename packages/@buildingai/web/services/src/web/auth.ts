import { type UserTerminalType } from "@buildingai/constants/shared";
import type { MutationOptionsUtil, UserInfo } from "@buildingai/web-types";
import { useMutation } from "@tanstack/react-query";

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

export type RegisterRequest = {
    username: string;
    password: string;
    confirmPassword: string;
    terminal: UserTerminalType;
    nickname?: string;
    email?: string;
    phone?: string;
};

export type RegisterResponse = LoginResponse;

export type CheckAccountRequest = {
    account: string;
};

export type CheckAccountResponse = {
    hasAccount: boolean;
    type: string;
    hasPassword: boolean;
};

export function useLoginMutation(options?: MutationOptionsUtil<LoginResponse, LoginRequest>) {
    return useMutation<LoginResponse, Error, LoginRequest>({
        mutationFn: (vars) => apiHttpClient.post<LoginResponse>("/auth/login", vars),
        ...options,
    });
}

export function useRegisterMutation(
    options?: MutationOptionsUtil<RegisterResponse, RegisterRequest>,
) {
    return useMutation<RegisterResponse, Error, RegisterRequest>({
        mutationFn: (vars) => apiHttpClient.post<RegisterResponse>("/auth/register", vars),
        ...options,
    });
}

export function useCheckAccountMutation(
    options?: MutationOptionsUtil<CheckAccountResponse, CheckAccountRequest>,
) {
    return useMutation<CheckAccountResponse, Error, CheckAccountRequest>({
        mutationFn: (vars) => apiHttpClient.post<CheckAccountResponse>("/auth/check-account", vars),
        ...options,
    });
}

export type OAuthSessionResponse = {
    token: string;
    user: UserInfo;
};

export function exchangeOAuthCode(code: string) {
    return apiHttpClient.get<OAuthSessionResponse>("/auth/oauth/session", {
        params: { code },
    });
}
