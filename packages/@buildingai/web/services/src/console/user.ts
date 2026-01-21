import type { BooleanNumberType, LoginType } from "@buildingai/constants";
import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
    UserInfo,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Types based on controller DTOs and entities
export type Role = {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type User = {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    userNo: string;
    username: string;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    phoneAreaCode: string | null;
    avatar: string | null;
    realName: string | null;
    totalRechargeAmount: number;
    status: BooleanNumberType;
    isRoot: BooleanNumberType;
    role: Role | null;
    lastLoginAt: string | null;
    power: number;
    source: number;
    membershipLevel: MembershipLevel | null;
};

export type MembershipLevel = {
    id: string;
    name: string;
    endTime?: string;
};

export type UserInfoResponse = {
    user: UserInfo & {
        permissions: number;
        membershipLevel: MembershipLevel | null;
    };
    permissions: string[];
    menus: any[];
};

export type QueryUserDto = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: BooleanNumberType;
    startTime?: string;
    endTime?: string;
};

export type CreateUserDto = {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    roleId?: string;
    status?: BooleanNumberType;
};

export type UpdateUserDto = {
    nickname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    roleId?: string;
    status?: BooleanNumberType;
};

export type BatchUpdateUserDto = {
    ids: string[];
    roleId?: string;
    status?: BooleanNumberType;
};

export type UpdateUserBalanceDto = {
    amount: number;
    type: "add" | "subtract" | "set";
    remark?: string;
};

export type LoginSettingsConfig = {
    allowedLoginMethods: LoginType[];
    allowedRegisterMethods: LoginType[];
    defaultLoginMethod: LoginType;
    allowMultipleLogin: boolean;
    showPolicyAgreement: boolean;
};

/**
 * Get current user info, permissions and menus
 */
export function useUserInfoQuery(options?: QueryOptionsUtil<UserInfoResponse>) {
    return useQuery<UserInfoResponse>({
        queryKey: ["users", "info"],
        queryFn: () => consoleHttpClient.get<UserInfoResponse>("/users/info"),
        ...options,
    });
}

/**
 * Get all roles list
 */
export function useRolesQuery(options?: QueryOptionsUtil<Role[]>) {
    return useQuery<Role[]>({
        queryKey: ["users", "roles"],
        queryFn: () => consoleHttpClient.get<Role[]>("/users/roles"),
        ...options,
    });
}

/**
 * Get user list with pagination
 */
export function useUsersListQuery(
    params?: QueryUserDto,
    options?: PaginatedQueryOptionsUtil<User>,
) {
    return useQuery({
        queryKey: ["users", "list", params],
        queryFn: () => consoleHttpClient.get<PaginatedResponse<User>>("/users", { params }),
        ...options,
    });
}

/**
 * Get user detail by ID
 */
export function useUserDetailQuery(id: string, options?: QueryOptionsUtil<User>) {
    return useQuery<User>({
        queryKey: ["users", "detail", id],
        queryFn: () => consoleHttpClient.get<User>(`/users/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * Create user
 */
export function useCreateUserMutation(options?: MutationOptionsUtil<User, CreateUserDto>) {
    return useMutation<User, Error, CreateUserDto>({
        mutationFn: (dto) => consoleHttpClient.post<User>("/users", dto),
        ...options,
    });
}

/**
 * Update user
 */
export function useUpdateUserMutation(
    options?: MutationOptionsUtil<User, { id: string; dto: UpdateUserDto }>,
) {
    return useMutation<User, Error, { id: string; dto: UpdateUserDto }>({
        mutationFn: ({ id, dto }) => consoleHttpClient.patch<User>(`/users/${id}`, dto),
        ...options,
    });
}

/**
 * Delete user
 */
export function useDeleteUserMutation(options?: MutationOptionsUtil<{ success: boolean }, string>) {
    return useMutation<{ success: boolean }, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<{ success: boolean }>(`/users/${id}`),
        ...options,
    });
}

/**
 * Batch delete users
 */
export function useBatchDeleteUsersMutation(
    options?: MutationOptionsUtil<{ success: boolean }, string[]>,
) {
    return useMutation<{ success: boolean }, Error, string[]>({
        mutationFn: (ids) =>
            consoleHttpClient.post<{ success: boolean }>("/users/batch-delete", { ids }),
        ...options,
    });
}

/**
 * Reset user password
 */
export function useResetPasswordMutation(
    options?: MutationOptionsUtil<boolean, { id: string; password: string }>,
) {
    return useMutation<boolean, Error, { id: string; password: string }>({
        mutationFn: ({ id, password }) =>
            consoleHttpClient.post<boolean>(`/users/reset-password/${id}`, { password }),
        ...options,
    });
}

/**
 * Auto reset user password (generate random password)
 */
export function useResetPasswordAutoMutation(
    options?: MutationOptionsUtil<{ password: string }, string>,
) {
    return useMutation<{ password: string }, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<{ password: string }>(`/users/reset-password-auto/${id}`),
        ...options,
    });
}

/**
 * Set user status
 */
export function useSetUserStatusMutation(
    options?: MutationOptionsUtil<User, { id: string; status: BooleanNumberType }>,
) {
    return useMutation<User, Error, { id: string; status: BooleanNumberType }>({
        mutationFn: ({ id, status }) =>
            consoleHttpClient.post<User>(`/users/status/${id}`, { status }),
        ...options,
    });
}

/**
 * Change user balance
 */
export function useChangeUserBalanceMutation(
    options?: MutationOptionsUtil<User, { id: string; dto: UpdateUserBalanceDto }>,
) {
    return useMutation<User, Error, { id: string; dto: UpdateUserBalanceDto }>({
        mutationFn: ({ id, dto }) =>
            consoleHttpClient.post<User>(`/users/change-balance/${id}`, dto),
        ...options,
    });
}

/**
 * Batch update users
 */
export function useBatchUpdateUsersMutation(
    options?: MutationOptionsUtil<{ success: boolean; count: number }, BatchUpdateUserDto>,
) {
    return useMutation<{ success: boolean; count: number }, Error, BatchUpdateUserDto>({
        mutationFn: (dto) =>
            consoleHttpClient.post<{ success: boolean; count: number }>("/users/batch-update", dto),
        ...options,
    });
}

/**
 * Get login settings
 */
export function useLoginSettingsQuery(options?: QueryOptionsUtil<LoginSettingsConfig>) {
    return useQuery<LoginSettingsConfig>({
        queryKey: ["users", "login-settings"],
        queryFn: () => consoleHttpClient.get<LoginSettingsConfig>("/users/login-settings"),
        ...options,
    });
}

/**
 * Set login settings
 */
export function useSetLoginSettingsMutation(
    options?: MutationOptionsUtil<LoginSettingsConfig, LoginSettingsConfig>,
) {
    return useMutation<LoginSettingsConfig, Error, LoginSettingsConfig>({
        mutationFn: (config) =>
            consoleHttpClient.post<LoginSettingsConfig>("/users/login-settings", config),
        ...options,
    });
}
