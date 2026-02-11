import type { MutationOptionsUtil } from "@buildingai/web-types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConsoleDatasetMemberUser = {
    id: string;
    nickname?: string;
    avatar?: string;
    [key: string]: unknown;
};

export type ConsoleDatasetMember = {
    id: string;
    datasetId: string;
    userId: string;
    role: string;
    isActive: boolean;
    user?: ConsoleDatasetMemberUser;
    [key: string]: unknown;
};

export type ConsoleDatasetApplication = {
    id: string;
    datasetId: string;
    userId: string;
    appliedRole: string;
    status: "pending" | "approved" | "rejected";
    message?: string | null;
    rejectReason?: string | null;
    user?: ConsoleDatasetMemberUser;
    [key: string]: unknown;
};

export type ConsoleDatasetMembersResponse = {
    items: ConsoleDatasetMember[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type ConsoleDatasetApplicationsResponse = {
    items: ConsoleDatasetApplication[];
};

export type ConsoleListMembersParams = { page?: number; pageSize?: number };
export type ConsoleListApplicationsParams = {
    status?: "pending" | "approved" | "rejected";
};

export function useConsoleDatasetMembersQuery(
    datasetId: string | null,
    params?: ConsoleListMembersParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["console", "datasets-members", datasetId, "members", params],
        queryFn: () =>
            consoleHttpClient.get<ConsoleDatasetMembersResponse>(
                `/datasets-members/${datasetId}/members`,
                { params: params ?? {} },
            ),
        enabled: !!datasetId && options?.enabled !== false,
        ...options,
    });
}

export function useConsoleDatasetMembersInfiniteQuery(
    datasetId: string | null,
    options?: { enabled?: boolean },
) {
    const result = useInfiniteQuery({
        queryKey: ["console", "datasets-members", datasetId, "members", "infinite"],
        queryFn: ({ pageParam }) =>
            consoleHttpClient.get<ConsoleDatasetMembersResponse>(
                `/datasets-members/${datasetId}/members`,
                { params: { page: pageParam as number, pageSize: 20 } },
            ),
        getNextPageParam: (lastPage) =>
            lastPage.page >= lastPage.totalPages ? undefined : lastPage.page + 1,
        initialPageParam: 1,
        enabled: !!datasetId && options?.enabled !== false,
        ...options,
    });
    const members = result.data?.pages.flatMap((p) => p.items) ?? [];
    return { ...result, members };
}

export function useConsoleDatasetApplicationsQuery(
    datasetId: string | null,
    params?: ConsoleListApplicationsParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["console", "datasets-members", datasetId, "applications", params],
        queryFn: () =>
            consoleHttpClient.get<ConsoleDatasetApplicationsResponse>(
                `/datasets-members/${datasetId}/applications`,
                { params: params ?? {} },
            ),
        enabled: !!datasetId && options?.enabled !== false,
        ...options,
    });
}

export function useConsoleUpdateDatasetMemberRoleMutation(
    datasetId: string,
    options?: MutationOptionsUtil<ConsoleDatasetMember, { memberId: string; role: string }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ memberId, role }) =>
            consoleHttpClient.patch<ConsoleDatasetMember>(
                `/datasets-members/${datasetId}/members/${memberId}/role`,
                { role },
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["console", "datasets-members", datasetId, "members"],
            }),
        ...options,
    });
}

export function useConsoleRemoveDatasetMemberMutation(
    datasetId: string,
    options?: MutationOptionsUtil<{ success: boolean }, string>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (memberId: string) =>
            consoleHttpClient.delete<{ success: boolean }>(
                `/datasets-members/${datasetId}/members/${memberId}`,
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["console", "datasets-members", datasetId, "members"],
            }),
        ...options,
    });
}

export function useConsoleApproveDatasetApplicationMutation(
    datasetId: string,
    options?: MutationOptionsUtil<ConsoleDatasetMember, string>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (applicationId: string) =>
            consoleHttpClient.post<ConsoleDatasetMember>(
                `/datasets-members/${datasetId}/applications/${applicationId}/approve`,
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["console", "datasets-members", datasetId, "members"],
            });
            queryClient.invalidateQueries({
                queryKey: ["console", "datasets-members", datasetId, "applications"],
            });
        },
        ...options,
    });
}

export function useConsoleRejectDatasetApplicationMutation(
    datasetId: string,
    options?: MutationOptionsUtil<
        { success: boolean },
        { applicationId: string; rejectReason?: string }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ applicationId, rejectReason }) =>
            consoleHttpClient.post<{ success: boolean }>(
                `/datasets-members/${datasetId}/applications/${applicationId}/reject`,
                { rejectReason },
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["console", "datasets-members", datasetId, "applications"],
            }),
        ...options,
    });
}
