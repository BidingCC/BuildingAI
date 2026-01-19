import type {
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Types based on controller DTOs and entities
export type PlatformSecretResult = {
    platformSecret: string | null;
    platformInfo: PlatformInfo | null;
};

export type PlatformInfo = {
    // Add platform info fields based on actual API response
    [key: string]: any;
};

export type SetPlatformSecretDto = {
    platformSecret: string;
};

export type DownloadExtensionDto = {
    version?: string;
};

export type CreateExtensionDto = {
    name: string;
    identifier: string;
    description?: string;
    author?: {
        name: string;
        avatar?: string;
        homepage?: string;
    };
    type: "application" | "functional";
    // Add other fields as needed
};

export type UpdateExtensionDto = {
    name?: string;
    description?: string;
    author?: {
        name?: string;
        avatar?: string;
        homepage?: string;
    };
    // Add other fields as needed
};

export type QueryExtensionDto = {
    page?: number;
    limit?: number;
    name?: string;
    identifier?: string;
    type?: "application" | "functional";
    status?: "active" | "inactive" | "error";
    isLocal?: boolean;
    isInstalled?: boolean;
};

export type BatchUpdateExtensionStatusDto = {
    ids: string[];
    status: "active" | "inactive" | "error";
};

export type Extension = {
    id: string;
    name: string;
    identifier: string;
    description?: string;
    author?: {
        name: string;
        avatar?: string;
        homepage?: string;
    };
    type: "application" | "functional";
    status: "active" | "inactive" | "error";
    version: string;
    isLocal: boolean;
    isInstalled: boolean;
    icon?: string;
    engine?: {
        buildingai: string;
    };
    createdAt: string;
    updatedAt: string;
    // Add other fields as needed
};

export type ExtensionVersion = {
    version: string;
    // Add version-specific fields
    [key: string]: any;
};

export type ExtensionFeature = {
    id: string;
    name: string;
    description?: string;
    path: string;
    method: string;
    membershipLevels: string[];
    // Add other feature fields
    [key: string]: any;
};

/**
 * Get platform secret
 */
export function usePlatformSecretQuery(options?: QueryOptionsUtil<PlatformSecretResult>) {
    return useQuery<PlatformSecretResult>({
        queryKey: ["extensions", "platform-secret"],
        queryFn: () => consoleHttpClient.get<PlatformSecretResult>("/extensions/platform-secret"),
        ...options,
    });
}

/**
 * Set platform secret
 */
export function useSetPlatformSecretMutation() {
    return useMutation<boolean, Error, SetPlatformSecretDto>({
        mutationFn: (dto) => consoleHttpClient.post<boolean>("/extensions/platform-secret", dto),
    });
}

/**
 * Install extension
 */
export function useInstallExtensionMutation() {
    return useMutation<Extension, Error, { identifier: string; dto: DownloadExtensionDto }>({
        mutationFn: ({ identifier, dto }) =>
            consoleHttpClient.post<Extension>(`/extensions/install/${identifier}`, dto),
    });
}

/**
 * Upgrade extension
 */
export function useUpgradeExtensionMutation() {
    return useMutation<Extension, Error, string>({
        mutationFn: (identifier) =>
            consoleHttpClient.post<Extension>(`/extensions/upgrade/${identifier}`),
    });
}

/**
 * Uninstall extension
 */
export function useUninstallExtensionMutation() {
    return useMutation<boolean, Error, string>({
        mutationFn: (identifier) =>
            consoleHttpClient.delete<boolean>(`/extensions/uninstall/${identifier}`),
    });
}

/**
 * Create extension
 */
export function useCreateExtensionMutation() {
    return useMutation<Extension, Error, CreateExtensionDto>({
        mutationFn: (dto) => consoleHttpClient.post<Extension>("/extensions", dto),
    });
}

/**
 * Get extension list
 */
export function useExtensionsListQuery(
    params?: QueryExtensionDto,
    options?: PaginatedQueryOptionsUtil<Extension>,
) {
    return useQuery({
        queryKey: ["extensions", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<Extension>>("/extensions", { params }),
        ...options,
    });
}

/**
 * Get extension versions
 */
export function useExtensionVersionsQuery(
    identifier: string,
    options?: QueryOptionsUtil<ExtensionVersion[]>,
) {
    return useQuery<ExtensionVersion[]>({
        queryKey: ["extensions", "versions", identifier],
        queryFn: () =>
            consoleHttpClient.get<ExtensionVersion[]>(`/extensions/versions/${identifier}`),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}

/**
 * Get all enabled extensions
 */
export function useEnabledExtensionsQuery(options?: QueryOptionsUtil<Extension[]>) {
    return useQuery<Extension[]>({
        queryKey: ["extensions", "enabled-all"],
        queryFn: () => consoleHttpClient.get<Extension[]>("/extensions/enabled/all"),
        ...options,
    });
}

/**
 * Get all local extensions
 */
export function useLocalExtensionsQuery(options?: QueryOptionsUtil<Extension[]>) {
    return useQuery<Extension[]>({
        queryKey: ["extensions", "local-all"],
        queryFn: () => consoleHttpClient.get<Extension[]>("/extensions/local/all"),
        ...options,
    });
}

/**
 * Get extensions by type
 */
export function useExtensionsByTypeQuery(
    type: "application" | "functional",
    onlyEnabled?: boolean,
    options?: QueryOptionsUtil<Extension[]>,
) {
    return useQuery<Extension[]>({
        queryKey: ["extensions", "type", type, onlyEnabled],
        queryFn: () =>
            consoleHttpClient.get<Extension[]>(`/extensions/type/${type}`, {
                params: { onlyEnabled },
            }),
        enabled: !!type && options?.enabled !== false,
        ...options,
    });
}

/**
 * Get extension detail by identifier (from database)
 */
export function useExtensionDetailQuery(identifier: string, options?: QueryOptionsUtil<Extension>) {
    return useQuery<Extension>({
        queryKey: ["extensions", "detail", identifier],
        queryFn: () => consoleHttpClient.get<Extension>(`/extensions/detail/${identifier}`),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}

/**
 * Get extension by identifier (from market)
 */
export function useExtensionByIdentifierQuery(
    identifier: string,
    options?: QueryOptionsUtil<Extension>,
) {
    return useQuery<Extension>({
        queryKey: ["extensions", "identifier", identifier],
        queryFn: () => consoleHttpClient.get<Extension>(`/extensions/identifier/${identifier}`),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}

/**
 * Check if extension identifier exists
 */
export function useCheckIdentifierQuery(
    identifier: string,
    excludeId?: string,
    options?: QueryOptionsUtil<{ exists: boolean }>,
) {
    return useQuery<{ exists: boolean }>({
        queryKey: ["extensions", "check-identifier", identifier, excludeId],
        queryFn: () =>
            consoleHttpClient.get<{ exists: boolean }>(
                `/extensions/check-identifier/${identifier}`,
                {
                    params: { excludeId },
                },
            ),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}

/**
 * Get extension features
 */
export function useExtensionFeaturesQuery(
    identifier: string,
    options?: QueryOptionsUtil<ExtensionFeature[]>,
) {
    return useQuery<ExtensionFeature[]>({
        queryKey: ["extensions", "features", identifier],
        queryFn: () =>
            consoleHttpClient.get<ExtensionFeature[]>(`/extensions/features/${identifier}`),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}

/**
 * Update feature membership levels
 */
export function useUpdateFeatureLevelsMutation() {
    return useMutation<ExtensionFeature, Error, { featureId: string; levelIds: string[] }>({
        mutationFn: ({ featureId, levelIds }) =>
            consoleHttpClient.patch<ExtensionFeature>(`/extensions/features/${featureId}/levels`, {
                levelIds,
            }),
    });
}

/**
 * Get extension by ID
 */
export function useExtensionQuery(id: string, options?: QueryOptionsUtil<Extension>) {
    return useQuery<Extension>({
        queryKey: ["extensions", id],
        queryFn: () => consoleHttpClient.get<Extension>(`/extensions/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * Batch update extension status
 */
export function useBatchUpdateStatusMutation() {
    return useMutation<{ message: string; count: number }, Error, BatchUpdateExtensionStatusDto>({
        mutationFn: (dto) =>
            consoleHttpClient.patch<{ message: string; count: number }>(
                "/extensions/batch-status",
                dto,
            ),
    });
}

/**
 * Update extension
 */
export function useUpdateExtensionMutation() {
    return useMutation<Extension, Error, { id: string; dto: UpdateExtensionDto }>({
        mutationFn: ({ id, dto }) => consoleHttpClient.patch<Extension>(`/extensions/${id}`, dto),
    });
}

/**
 * Enable extension
 */
export function useEnableExtensionMutation() {
    return useMutation<Extension, Error, string>({
        mutationFn: (id) => consoleHttpClient.patch<Extension>(`/extensions/${id}/enable`),
    });
}

/**
 * Disable extension
 */
export function useDisableExtensionMutation() {
    return useMutation<Extension, Error, string>({
        mutationFn: (id) => consoleHttpClient.patch<Extension>(`/extensions/${id}/disable`),
    });
}

/**
 * Set extension status
 */
export function useSetExtensionStatusMutation() {
    return useMutation<Extension, Error, { id: string; status: "active" | "inactive" | "error" }>({
        mutationFn: ({ id, status }) =>
            consoleHttpClient.patch<Extension>(`/extensions/${id}/status`, { status }),
    });
}

/**
 * Delete extension
 */
export function useDeleteExtensionMutation() {
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<{ message: string }>(`/extensions/${id}`),
    });
}

/**
 * Batch delete extensions
 */
export function useBatchDeleteExtensionsMutation() {
    return useMutation<{ message: string; deleted: number }, Error, string[]>({
        mutationFn: (ids) =>
            consoleHttpClient.delete<{ message: string; deleted: number }>("/extensions", {
                data: { ids },
            }),
    });
}

/**
 * Sync member features
 */
export function useSyncMemberFeaturesMutation() {
    return useMutation<
        { message: string; added: number; updated: number; removed: number },
        Error,
        string
    >({
        mutationFn: (identifier) =>
            consoleHttpClient.post<{
                message: string;
                added: number;
                updated: number;
                removed: number;
            }>(`/extensions/sync-member-features/${identifier}`),
    });
}

/**
 * Get plugin layout configuration
 */
export function usePluginLayoutQuery(
    identifier: string,
    options?: QueryOptionsUtil<{ manifest: any; consoleMenu: any }>,
) {
    return useQuery<{ manifest: any; consoleMenu: any }>({
        queryKey: ["extensions", "plugin-layout", identifier],
        queryFn: () =>
            consoleHttpClient.get<{ manifest: any; consoleMenu: any }>(
                `/extensions/${identifier}/plugin-layout`,
            ),
        enabled: !!identifier && options?.enabled !== false,
        ...options,
    });
}
