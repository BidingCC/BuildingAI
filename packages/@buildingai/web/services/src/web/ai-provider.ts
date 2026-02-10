import type { QueryOptionsUtil } from "@buildingai/web-types";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

/**
 * AI模型配置
 */
export type AiModelConfig = {
    field: string;
    value: any;
};

/**
 * AI模型信息
 */
export type AiModel = {
    id: string;
    name: string;
    model: string;
    modelType: string;
    providerId: string;
    features?: string[];
    maxContext?: number;
    modelConfig?: Record<string, any> | AiModelConfig[];
    isActive: boolean;
    description?: string;
    sortOrder: number;
    billingRule: {
        power: number;
        tokens: number;
    };
    membershipLevel: string[];
    isBuiltIn: boolean;
    createdAt: string;
    updatedAt: string;
};

/**
 * AI供应商信息
 */
export type AiProvider = {
    id: string;
    provider: string;
    name: string;
    description?: string;
    bindSecretId?: string;
    iconUrl?: string;
    supportedModelTypes: string[];
    isActive: boolean;
    isBuiltIn: boolean;
    sortOrder: number;
    models?: AiModel[];
    createdAt: string;
    updatedAt: string;
};

/**
 * 查询AI供应商参数
 */
export type QueryAiProvidersParams = {
    name?: string;
    supportedModelTypes?: string | string[];
};

/**
 * 获取AI供应商列表
 */
export function useAiProvidersQuery(
    params?: QueryAiProvidersParams,
    options?: QueryOptionsUtil<AiProvider[]>,
): UseQueryResult<AiProvider[], unknown> {
    return useQuery<AiProvider[]>({
        queryKey: ["ai-providers", params],
        queryFn: () =>
            apiHttpClient.get<AiProvider[]>("/ai-providers", {
                params,
            }),
        ...options,
    });
}

/**
 * 获取指定供应商信息
 */
export function useAiProviderQuery(
    providerId: string,
    options?: QueryOptionsUtil<AiProvider>,
): UseQueryResult<AiProvider, unknown> {
    return useQuery<AiProvider>({
        queryKey: ["ai-provider", providerId],
        queryFn: () => apiHttpClient.get<AiProvider>(`/ai-providers/${providerId}`),
        enabled: !!providerId && options?.enabled !== false,
        ...options,
    });
}

/**
 * 根据供应商代码获取供应商
 */
export function useAiProviderByCodeQuery(
    providerCode: string,
    options?: QueryOptionsUtil<AiProvider>,
): UseQueryResult<AiProvider, unknown> {
    return useQuery<AiProvider>({
        queryKey: ["ai-provider-by-code", providerCode],
        queryFn: () => apiHttpClient.get<AiProvider>(`/ai-providers/by-code/${providerCode}`),
        enabled: !!providerCode && options?.enabled !== false,
        ...options,
    });
}
