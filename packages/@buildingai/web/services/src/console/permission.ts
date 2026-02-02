import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Types based on controller entities
export type PermissionType = "api" | "system";

export type Permission = {
    id: string;
    code: string;
    name: string;
    description?: string;
    group?: string;
    groupName?: string;
    type: PermissionType;
    isDeprecated: boolean;
    createdAt: string;
    updatedAt: string;
};

export type PermissionItem = {
    code: string;
    name: string;
    description?: string;
};

export type PermissionGroupItem = {
    code: string;
    name: string;
    permissions: PermissionItem[];
};

export type ApiRouterItem = {
    path: string;
    method: string;
    permission?: PermissionItem;
};

export type ApiRouterGroupItem = {
    code: string;
    name: string;
    routes: ApiRouterItem[];
};

export type GroupedPermissions = {
    code: string;
    name: string;
    permissions: Permission[];
};

export type SyncPermissionsResult = {
    added: number;
    updated: number;
    deprecated: number;
    total: number;
};

export type CleanupPermissionsResult = {
    removed: number;
};

export type QueryPermissionListParams = {
    type?: string;
    group?: string;
    keyword?: string;
    isDeprecated?: boolean;
    isGrouped?: boolean;
};

/**
 * Scan all API permissions (real-time)
 */
export function useScanPermissionsQuery(
    group: boolean = true,
    options?: QueryOptionsUtil<PermissionItem[] | PermissionGroupItem[]>,
) {
    return useQuery<PermissionItem[] | PermissionGroupItem[]>({
        queryKey: ["permission", "scan-permissions", group],
        queryFn: () =>
            consoleHttpClient.get<PermissionItem[] | PermissionGroupItem[]>(
                "/permission/scan-permissions",
                { params: { group: String(group) } },
            ),
        ...options,
    });
}

/**
 * Scan all API routes with permissions (real-time)
 */
export function useScanApiQuery(
    group: boolean = true,
    options?: QueryOptionsUtil<ApiRouterItem[] | ApiRouterGroupItem[]>,
) {
    return useQuery<ApiRouterItem[] | ApiRouterGroupItem[]>({
        queryKey: ["permission", "scan-api", group],
        queryFn: () =>
            consoleHttpClient.get<ApiRouterItem[] | ApiRouterGroupItem[]>("/permission/scan-api", {
                params: { group: String(group) },
            }),
        ...options,
    });
}

/**
 * Get permission list from database
 */
export function usePermissionListQuery(
    params?: QueryPermissionListParams,
    options?: QueryOptionsUtil<Permission[] | GroupedPermissions[]>,
) {
    return useQuery<Permission[] | GroupedPermissions[]>({
        queryKey: ["permission", "list", params],
        queryFn: () =>
            consoleHttpClient.get<Permission[] | GroupedPermissions[]>("/permission/list", {
                params,
            }),
        ...options,
    });
}

/**
 * Get permission detail by code
 */
export function usePermissionDetailQuery(code: string, options?: QueryOptionsUtil<Permission>) {
    return useQuery<Permission>({
        queryKey: ["permission", "detail", code],
        queryFn: () => consoleHttpClient.get<Permission>(`/permission/${code}`),
        enabled: !!code && options?.enabled !== false,
        ...options,
    });
}

/**
 * Sync API permissions to database
 */
export function useSyncPermissionsMutation(
    options?: MutationOptionsUtil<SyncPermissionsResult, void>,
) {
    return useMutation<SyncPermissionsResult, Error, void>({
        mutationFn: () => consoleHttpClient.post<SyncPermissionsResult>("/permission/sync"),
        ...options,
    });
}

/**
 * Cleanup deprecated permissions
 */
export function useCleanupPermissionsMutation(
    options?: MutationOptionsUtil<CleanupPermissionsResult, void>,
) {
    return useMutation<CleanupPermissionsResult, Error, void>({
        mutationFn: () => consoleHttpClient.post<CleanupPermissionsResult>("/permission/cleanup"),
        ...options,
    });
}
