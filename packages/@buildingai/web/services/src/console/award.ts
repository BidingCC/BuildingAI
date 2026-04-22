import type {
    MutationOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type RegisterAwardConfig = {
    status: number;
    registerAward: number;
};

export type UpdateRegisterAwardDto = {
    status: number;
    registerAward: number;
};

export type SignAwardConfig = {
    status: number;
    signAward: number;
};

export type UpdateSignAwardDto = {
    status: number;
    signAward: number;
};

export type LoginAwardItem = {
    id: number | string;
    name: string;
    level: number | string;
    award: number;
};

export type LoginAwardConfig = {
    status: number;
    loginAward: LoginAwardItem[];
};

export type UpdateLoginAwardDto = {
    status: number;
    loginAward: Array<{
        id: string;
        name: string;
        level: string;
        award: number;
    }>;
};

export type QuerySignRecordDto = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    startTime?: string;
    endTime?: string;
};

export type SignRecordListItem = {
    id: string;
    userId: string;
    signTime: string;
    signDate: string;
    signAward: number;
    terminal: number;
    terminalDesc?: string;
    user?: {
        id: string;
        userNo?: string;
        avatar?: string;
        username?: string;
        nickname?: string;
        phone?: string;
    } | null;
};

export type SignRecordListResponse = PaginatedResponse<SignRecordListItem> & {
    extend?: {
        todaySignCount: number;
        todaySignAward: number;
        totalSignAward: number;
    };
};

export function useRegisterAwardConfigQuery(
    options?: QueryOptionsUtil<RegisterAwardConfig>,
): UseQueryResult<RegisterAwardConfig, Error> {
    return useQuery<RegisterAwardConfig>({
        queryKey: ["award", "register-award"],
        queryFn: () => consoleHttpClient.get<RegisterAwardConfig>("/award/register-award"),
        ...options,
    });
}

export function useLoginAwardConfigQuery(
    options?: QueryOptionsUtil<LoginAwardConfig>,
): UseQueryResult<LoginAwardConfig, Error> {
    return useQuery<LoginAwardConfig>({
        queryKey: ["award", "login-award"],
        queryFn: () => consoleHttpClient.get<LoginAwardConfig>("/award/login-award"),
        ...options,
    });
}

export function useSignAwardConfigQuery(
    options?: QueryOptionsUtil<SignAwardConfig>,
): UseQueryResult<SignAwardConfig, Error> {
    return useQuery<SignAwardConfig>({
        queryKey: ["award", "sign-award"],
        queryFn: () => consoleHttpClient.get<SignAwardConfig>("/award/sign-award"),
        ...options,
    });
}

export function useSetLoginAwardConfigMutation(
    options?: MutationOptionsUtil<LoginAwardConfig, UpdateLoginAwardDto>,
): UseMutationResult<LoginAwardConfig, Error, UpdateLoginAwardDto, unknown> {
    const queryClient = useQueryClient();

    return useMutation<LoginAwardConfig, Error, UpdateLoginAwardDto>({
        mutationFn: (dto) => consoleHttpClient.post<LoginAwardConfig>("/award/login-award", dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["award", "login-award"] });
        },
        ...options,
    });
}

export function useSetRegisterAwardConfigMutation(
    options?: MutationOptionsUtil<RegisterAwardConfig, UpdateRegisterAwardDto>,
): UseMutationResult<RegisterAwardConfig, Error, UpdateRegisterAwardDto, unknown> {
    const queryClient = useQueryClient();

    return useMutation<RegisterAwardConfig, Error, UpdateRegisterAwardDto>({
        mutationFn: (dto) =>
            consoleHttpClient.post<RegisterAwardConfig>("/award/register-award", dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["award", "register-award"] });
        },
        ...options,
    });
}

export function useSetSignAwardConfigMutation(
    options?: MutationOptionsUtil<SignAwardConfig, UpdateSignAwardDto>,
): UseMutationResult<SignAwardConfig, Error, UpdateSignAwardDto, unknown> {
    const queryClient = useQueryClient();

    return useMutation<SignAwardConfig, Error, UpdateSignAwardDto>({
        mutationFn: (dto) => consoleHttpClient.post<SignAwardConfig>("/award/sign-award", dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["award", "sign-award"] });
        },
        ...options,
    });
}

export function useSignRecordListQuery(
    params?: QuerySignRecordDto,
    options?: QueryOptionsUtil<SignRecordListResponse>,
) {
    return useQuery<SignRecordListResponse>({
        queryKey: ["award-record", "sign-record", params],
        queryFn: () =>
            consoleHttpClient.get<SignRecordListResponse>("/award-record/signRecord", { params }),
        ...options,
    });
}
