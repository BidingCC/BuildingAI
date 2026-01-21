import type { ModelType } from "@buildingai/ai-sdk";
import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Types based on controller DTOs and entities
export type CreateAiProviderDto = {
    provider: string;
    name: string;
    description?: string;
    bindSecretId: string;
    supportedModelTypes?: ModelType[];
    iconUrl?: string;
    websiteUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
};

export type UpdateAiProviderDto = Partial<CreateAiProviderDto>;

export type QueryAiProviderDto = {
    keyword?: string;
    isActive?: boolean;
    supportedModelTypes?: ModelType[];
};

export type AiProviderModel = {
    id: string;
    name: string;
    model: string;
    modelType: ModelType;
    providerId: string;
    features: string[];
    maxContext: number;
    modelConfig: ModelConfig[];
    isActive: boolean;
    description?: string;
    sortOrder: number;
    billingRule: BillingRule;
    membershipLevel: string[];
    isBuiltIn: boolean;
    createdAt: string;
    updatedAt: string;
};

export type ModelConfig = {
    field: string;
    title: string;
    value: number | string;
    enable: boolean;
    description: string;
};

export type BillingRule = {
    power: number;
    tokens: number;
};

export type AiProvider = {
    id: string;
    createdAt: string;
    updatedAt: string;
    provider: string;
    name: string;
    description?: string;
    bindSecretId?: string;
    iconUrl?: string;
    websiteUrl?: string;
    supportedModelTypes: ModelType[];
    isActive: boolean;
    isBuiltIn: boolean;
    sortOrder: number;
    models?: AiProviderModel[];
};

export type BatchProviderOperationDto = {
    providerIds: string[];
};

export type ToggleProviderStatusDto = BatchProviderOperationDto & {
    isActive: boolean;
};

/**
 * Create AI provider
 */
export function useCreateAiProviderMutation(
    options?: MutationOptionsUtil<AiProvider, CreateAiProviderDto>,
) {
    return useMutation<AiProvider, Error, CreateAiProviderDto>({
        mutationFn: (dto) => consoleHttpClient.post<AiProvider>("/ai-providers", dto),
        ...options,
    });
}

/**
 * Get AI provider list
 */
export function useAiProvidersQuery(
    params?: QueryAiProviderDto,
    options?: QueryOptionsUtil<AiProvider[]>,
) {
    return useQuery<AiProvider[]>({
        queryKey: ["ai-providers", "list", params],
        queryFn: () => consoleHttpClient.get<AiProvider[]>("/ai-providers", { params }),
        ...options,
    });
}

/**
 * Get AI provider detail
 */
export function useAiProviderQuery(id: string, options?: QueryOptionsUtil<AiProvider>) {
    return useQuery<AiProvider>({
        queryKey: ["ai-providers", id],
        queryFn: () => consoleHttpClient.get<AiProvider>(`/ai-providers/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * Get AI provider full detail (with sensitive info)
 */
export function useAiProviderFullQuery(id: string, options?: QueryOptionsUtil<AiProvider>) {
    return useQuery<AiProvider>({
        queryKey: ["ai-providers", id, "full"],
        queryFn: () => consoleHttpClient.get<AiProvider>(`/ai-providers/${id}/full`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * Update AI provider
 */
export function useUpdateAiProviderMutation(
    options?: MutationOptionsUtil<AiProvider, { id: string; dto: UpdateAiProviderDto }>,
) {
    return useMutation<AiProvider, Error, { id: string; dto: UpdateAiProviderDto }>({
        mutationFn: ({ id, dto }) =>
            consoleHttpClient.patch<AiProvider>(`/ai-providers/${id}`, dto),
        ...options,
    });
}

/**
 * Delete AI provider
 */
export function useDeleteAiProviderMutation(
    options?: MutationOptionsUtil<{ message: string }, string>,
) {
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<{ message: string }>(`/ai-providers/${id}`),
        ...options,
    });
}

/**
 * Batch delete AI providers
 */
export function useBatchDeleteAiProvidersMutation(
    options?: MutationOptionsUtil<{ message: string; deleted: number }, string[]>,
) {
    return useMutation<{ message: string; deleted: number }, Error, string[]>({
        mutationFn: (ids) =>
            consoleHttpClient.delete<{ message: string; deleted: number }>("/ai-providers", {
                data: { ids },
            }),
        ...options,
    });
}

/**
 * Get all active AI providers
 */
export function useActiveAiProvidersQuery(options?: QueryOptionsUtil<AiProvider[]>) {
    return useQuery<AiProvider[]>({
        queryKey: ["ai-providers", "active-all"],
        queryFn: () => consoleHttpClient.get<AiProvider[]>("/ai-providers/active/all"),
        ...options,
    });
}

/**
 * Get AI provider by code
 */
export function useAiProviderByCodeQuery(
    provider: string,
    options?: QueryOptionsUtil<AiProvider | { message: string }>,
) {
    return useQuery<AiProvider | { message: string }>({
        queryKey: ["ai-providers", "by-code", provider],
        queryFn: () =>
            consoleHttpClient.get<AiProvider | { message: string }>(
                `/ai-providers/by-code/${provider}`,
            ),
        enabled: !!provider && options?.enabled !== false,
        ...options,
    });
}

/**
 * Toggle AI provider active status
 */
export function useToggleAiProviderActiveMutation(
    options?: MutationOptionsUtil<AiProvider, { id: string; isActive: boolean }>,
) {
    return useMutation<AiProvider, Error, { id: string; isActive: boolean }>({
        mutationFn: ({ id, isActive }) =>
            consoleHttpClient.patch<AiProvider>(`/ai-providers/${id}/toggle-active`, { isActive }),
        ...options,
    });
}

/**
 * Toggle AI model active status
 */
export function useToggleAiModelActiveMutation(
    options?: MutationOptionsUtil<AiProviderModel, { id: string; isActive: boolean }>,
) {
    return useMutation<AiProviderModel, Error, { id: string; isActive: boolean }>({
        mutationFn: ({ id, isActive }) =>
            consoleHttpClient.patch<AiProviderModel>(`/ai-models/${id}/toggle-active`, {
                isActive,
            }),
        ...options,
    });
}
