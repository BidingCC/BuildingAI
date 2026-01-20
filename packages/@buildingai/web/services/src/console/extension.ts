import type {
    ExtensionStatusType,
    ExtensionSupportTerminalType,
    ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import type {
    MutationOptionsUtil,
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
    alias?: string;
    description?: string;
    type: ExtensionTypeType;
    author?: {
        name?: string;
        avatar?: string;
        homepage?: string;
    };
    homepage?: string;
    documentation?: string;
    config?: Record<string, any>;
};

export type UpdateExtensionDto = {
    name?: string;
    alias?: string;
    description?: string;
    type?: ExtensionTypeType;
    author?: {
        name?: string;
        avatar?: string;
        homepage?: string;
    };
    homepage?: string;
    documentation?: string;
    config?: Record<string, any>;
};

export type QueryExtensionDto = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    identifier?: string;
    type?: ExtensionTypeType;
    status?: ExtensionStatusType;
    isLocal?: boolean;
    isInstalled?: boolean;
};

export type BatchUpdateExtensionStatusDto = {
    ids: string[];
    status: ExtensionStatusType;
};

export type Extension = {
    id: string;
    name: string;
    alias?: string;
    identifier: string;
    version: string;
    description?: string;
    icon?: string;
    type: ExtensionTypeType;
    supportTerminal?: ExtensionSupportTerminalType[];
    isLocal: boolean;
    status: ExtensionStatusType;
    author?: {
        name?: string;
        avatar?: string;
        homepage?: string;
    };
    homepage?: string;
    documentation?: string;
    config?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    isInstalled: boolean;
    isCompatible: boolean;
    latestVersion?: string | null;
    hasUpdate: boolean;
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
export function useSetPlatformSecretMutation(
    options?: MutationOptionsUtil<boolean, SetPlatformSecretDto>,
) {
    return useMutation<boolean, Error, SetPlatformSecretDto>({
        mutationFn: (dto) => consoleHttpClient.post<boolean>("/extensions/platform-secret", dto),
        ...options,
    });
}

/**
 * Install extension
 */
export function useInstallExtensionMutation(
    options?: MutationOptionsUtil<Extension, { identifier: string; dto: DownloadExtensionDto }>,
) {
    return useMutation<Extension, Error, { identifier: string; dto: DownloadExtensionDto }>({
        mutationFn: ({ identifier, dto }) =>
            consoleHttpClient.post<Extension>(`/extensions/install/${identifier}`, dto),
        ...options,
    });
}

/**
 * Upgrade extension
 */
export function useUpgradeExtensionMutation(options?: MutationOptionsUtil<Extension, string>) {
    return useMutation<Extension, Error, string>({
        mutationFn: (identifier) =>
            consoleHttpClient.post<Extension>(`/extensions/upgrade/${identifier}`),
        ...options,
    });
}

/**
 * Uninstall extension
 */
export function useUninstallExtensionMutation(options?: MutationOptionsUtil<boolean, string>) {
    return useMutation<boolean, Error, string>({
        mutationFn: (identifier) =>
            consoleHttpClient.delete<boolean>(`/extensions/uninstall/${identifier}`),
        ...options,
    });
}

/**
 * Create extension
 */
export function useCreateExtensionMutation(
    options?: MutationOptionsUtil<Extension, CreateExtensionDto>,
) {
    return useMutation<Extension, Error, CreateExtensionDto>({
        mutationFn: (dto) => consoleHttpClient.post<Extension>("/extensions", dto),
        ...options,
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
    type: ExtensionTypeType,
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
export function useUpdateFeatureLevelsMutation(
    options?: MutationOptionsUtil<ExtensionFeature, { featureId: string; levelIds: string[] }>,
) {
    return useMutation<ExtensionFeature, Error, { featureId: string; levelIds: string[] }>({
        mutationFn: ({ featureId, levelIds }) =>
            consoleHttpClient.patch<ExtensionFeature>(`/extensions/features/${featureId}/levels`, {
                levelIds,
            }),
        ...options,
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
export function useBatchUpdateStatusMutation(
    options?: MutationOptionsUtil<
        { message: string; count: number },
        BatchUpdateExtensionStatusDto
    >,
) {
    return useMutation<{ message: string; count: number }, Error, BatchUpdateExtensionStatusDto>({
        mutationFn: (dto) =>
            consoleHttpClient.patch<{ message: string; count: number }>(
                "/extensions/batch-status",
                dto,
            ),
        ...options,
    });
}

/**
 * Update extension
 */
export function useUpdateExtensionMutation(
    options?: MutationOptionsUtil<Extension, { id: string; dto: UpdateExtensionDto }>,
) {
    return useMutation<Extension, Error, { id: string; dto: UpdateExtensionDto }>({
        mutationFn: ({ id, dto }) => consoleHttpClient.patch<Extension>(`/extensions/${id}`, dto),
        ...options,
    });
}

/**
 * Enable extension
 */
export function useEnableExtensionMutation(options?: MutationOptionsUtil<Extension, string>) {
    return useMutation<Extension, Error, string>({
        mutationFn: (id) => consoleHttpClient.patch<Extension>(`/extensions/${id}/enable`),
        ...options,
    });
}

/**
 * Disable extension
 */
export function useDisableExtensionMutation(options?: MutationOptionsUtil<Extension, string>) {
    return useMutation<Extension, Error, string>({
        mutationFn: (id) => consoleHttpClient.patch<Extension>(`/extensions/${id}/disable`),
        ...options,
    });
}

/**
 * Set extension status
 */
export function useSetExtensionStatusMutation(
    options?: MutationOptionsUtil<Extension, { id: string; status: ExtensionStatusType }>,
) {
    return useMutation<Extension, Error, { id: string; status: ExtensionStatusType }>({
        mutationFn: ({ id, status }) =>
            consoleHttpClient.patch<Extension>(`/extensions/${id}/status`, { status }),
        ...options,
    });
}

/**
 * Delete extension
 */
export function useDeleteExtensionMutation(
    options?: MutationOptionsUtil<{ message: string }, string>,
) {
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<{ message: string }>(`/extensions/${id}`),
        ...options,
    });
}

/**
 * Batch delete extensions
 */
export function useBatchDeleteExtensionsMutation(
    options?: MutationOptionsUtil<{ message: string; deleted: number }, string[]>,
) {
    return useMutation<{ message: string; deleted: number }, Error, string[]>({
        mutationFn: (ids) =>
            consoleHttpClient.delete<{ message: string; deleted: number }>("/extensions", {
                data: { ids },
            }),
        ...options,
    });
}

/**
 * Sync member features
 */
export function useSyncMemberFeaturesMutation(
    options?: MutationOptionsUtil<
        { message: string; added: number; updated: number; removed: number },
        string
    >,
) {
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
        ...options,
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
