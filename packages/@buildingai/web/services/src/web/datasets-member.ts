import { useAuthStore } from "@buildingai/stores";
import type { PaginatedQueryOptionsUtil, PaginatedResponse } from "@buildingai/web-types";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
export type ApplyToDatasetParams = {
    appliedRole?: "owner" | "manager" | "editor" | "viewer";
    message?: string;
};

export type RejectApplicationParams = {
    rejectReason?: string;
};

export type UpdateMemberRoleParams = {
    role: "owner" | "manager" | "editor" | "viewer";
};

export type ListMembersParams = {
    page?: number;
    pageSize?: number;
};

export type ListApplicationsParams = {
    status?: "pending" | "approved" | "rejected";
    page?: number;
    pageSize?: number;
};

export type DatasetMember = {
    id: string;
    datasetId: string;
    userId: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
    [key: string]: unknown;
};

export type DatasetApplication = {
    id: string;
    datasetId: string;
    userId: string;
    appliedRole: string;
    status: "pending" | "approved" | "rejected";
    message?: string | null;
    rejectReason?: string | null;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
};

export async function listDatasetsMembers(
    datasetId: string,
    params?: ListMembersParams,
): Promise<PaginatedResponse<DatasetMember>> {
    return apiHttpClient.get<PaginatedResponse<DatasetMember>>(
        `/ai-datasets/${datasetId}/members`,
        { params: params ?? {} },
    );
}

export async function listDatasetsApplications(
    datasetId: string,
    params?: ListApplicationsParams,
): Promise<PaginatedResponse<DatasetApplication>> {
    return apiHttpClient.get<PaginatedResponse<DatasetApplication>>(
        `/ai-datasets/${datasetId}/applications`,
        { params: params ?? {} },
    );
}

export async function applyToDataset(
    datasetId: string,
    params?: ApplyToDatasetParams,
): Promise<unknown> {
    return apiHttpClient.post(`/ai-datasets/${datasetId}/apply`, params ?? {});
}

export async function approveDatasetApplication(
    datasetId: string,
    applicationId: string,
): Promise<unknown> {
    return apiHttpClient.post(`/ai-datasets/${datasetId}/applications/${applicationId}/approve`);
}

export async function rejectDatasetApplication(
    datasetId: string,
    applicationId: string,
    params?: RejectApplicationParams,
): Promise<{ success: boolean }> {
    return apiHttpClient.post<{ success: boolean }>(
        `/ai-datasets/${datasetId}/applications/${applicationId}/reject`,
        params ?? {},
    );
}

export async function updateDatasetsMemberRole(
    datasetId: string,
    memberId: string,
    params: UpdateMemberRoleParams,
): Promise<DatasetMember> {
    return apiHttpClient.patch<DatasetMember>(
        `/ai-datasets/${datasetId}/members/${memberId}/role`,
        params,
    );
}

export async function removeDatasetsMember(
    datasetId: string,
    memberId: string,
): Promise<{ success: boolean }> {
    return apiHttpClient.delete<{ success: boolean }>(
        `/ai-datasets/${datasetId}/members/${memberId}`,
    );
}

export function useDatasetsMembersQuery(
    datasetId: string,
    params?: ListMembersParams,
    options?: PaginatedQueryOptionsUtil<DatasetMember>,
): UseQueryResult<PaginatedResponse<DatasetMember>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<PaginatedResponse<DatasetMember>>({
        queryKey: ["datasets", datasetId, "members", params],
        queryFn: () => listDatasetsMembers(datasetId, params),
        enabled: !!datasetId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useDatasetsApplicationsQuery(
    datasetId: string,
    params?: ListApplicationsParams,
    options?: PaginatedQueryOptionsUtil<DatasetApplication>,
): UseQueryResult<PaginatedResponse<DatasetApplication>, unknown> {
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useQuery<PaginatedResponse<DatasetApplication>>({
        queryKey: ["datasets", datasetId, "applications", params],
        queryFn: () => listDatasetsApplications(datasetId, params),
        enabled: !!datasetId && isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useApplyToDataset(
    datasetId: string,
): UseMutationResult<unknown, unknown, ApplyToDatasetParams | undefined, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params) => applyToDataset(datasetId, params),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "applications"],
            });
        },
    });
}

export function useApproveDatasetApplication(
    datasetId: string,
): UseMutationResult<unknown, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (applicationId: string) => approveDatasetApplication(datasetId, applicationId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "applications"],
            });
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "members"],
            });
        },
    });
}

export function useRejectDatasetApplication(
    datasetId: string,
): UseMutationResult<
    { success: boolean },
    unknown,
    { applicationId: string; params?: RejectApplicationParams },
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ applicationId, params }) =>
            rejectDatasetApplication(datasetId, applicationId, params),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "applications"],
            });
        },
    });
}

export function useUpdateDatasetsMemberRole(
    datasetId: string,
): UseMutationResult<
    DatasetMember,
    unknown,
    { memberId: string; params: UpdateMemberRoleParams },
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ memberId, params }) => updateDatasetsMemberRole(datasetId, memberId, params),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "members"],
            });
        },
    });
}

export function useRemoveDatasetsMember(
    datasetId: string,
): UseMutationResult<{ success: boolean }, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (memberId: string) => removeDatasetsMember(datasetId, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["datasets", datasetId, "members"],
            });
        },
    });
}
