import type { BooleanNumberType } from "@buildingai/constants/shared/status-codes.constant";
import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

// Types based on controller DTOs and entities

export type SecretTemplateFieldConfig = {
    name: string;
    required?: boolean;
    placeholder?: string;
};

export type SecretFieldValue = {
    name: string;
    value: string;
    encrypted?: boolean;
};

export type Secret = {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    templateId: string;
    fieldValues?: SecretFieldValue[];
    remark?: string;
    status: BooleanNumberType;
    lastUsedAt: string | null;
    usageCount: number;
    sortOrder: number;
};

export type SecretTemplate = {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    icon?: string;
    fieldConfig: SecretTemplateFieldConfig[];
    isEnabled: BooleanNumberType;
    sortOrder: number;
    Secrets?: Secret[];
};

export type QuerySecretTemplateDto = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isEnabled?: BooleanNumberType;
};

export type CreateSecretTemplateDto = {
    name: string;
    icon?: string;
    fieldConfig: SecretTemplateFieldConfig[];
    isEnabled?: BooleanNumberType;
    sortOrder?: number;
};

export type UpdateSecretTemplateDto = {
    name?: string;
    icon?: string;
    fieldConfig?: SecretTemplateFieldConfig[];
    isEnabled?: BooleanNumberType;
    sortOrder?: number;
};

export type ImportSecretTemplateJsonDto = {
    json: string;
};

// API Functions

const getSecretTemplatesList = (params?: QuerySecretTemplateDto) =>
    consoleHttpClient.get<PaginatedResponse<SecretTemplate>>("secret-templates", { params });

const getEnabledSecretTemplates = () =>
    consoleHttpClient.get<SecretTemplate[]>("secret-templates/enabled/all");

const getAllSecretTemplates = () => consoleHttpClient.get<SecretTemplate[]>("secret-templates/all");

const getSecretTemplateDetail = (id: string) =>
    consoleHttpClient.get<SecretTemplate>(`secret-templates/${id}`);

const createSecretTemplate = (data: CreateSecretTemplateDto) =>
    consoleHttpClient.post<SecretTemplate>("secret-templates", data);

const importSecretTemplateJson = (data: ImportSecretTemplateJsonDto) =>
    consoleHttpClient.post<SecretTemplate>("secret-templates/import/json", data);

const updateSecretTemplate = (id: string, data: UpdateSecretTemplateDto) =>
    consoleHttpClient.patch<SecretTemplate>(`secret-templates/${id}`, data);

const setSecretTemplateEnabled = (id: string, isEnabled: BooleanNumberType) =>
    consoleHttpClient.patch<SecretTemplate>(`secret-templates/${id}/enabled`, { isEnabled });

const deleteSecretTemplate = (id: string) =>
    consoleHttpClient.delete<{ message: string }>(`secret-templates/${id}`);

const batchDeleteSecretTemplates = (ids: string[]) =>
    consoleHttpClient.delete<{ message: string; deleted: number }>("secret-templates", {
        data: { ids },
    });

// Query Hooks

/**
 * Query hook for fetching paginated secret templates list
 */
export const useSecretTemplatesListQuery = (
    params?: QuerySecretTemplateDto,
    options?: PaginatedQueryOptionsUtil<SecretTemplate>,
) => {
    return useQuery({
        queryKey: ["secret-templates", "list", params],
        queryFn: () => getSecretTemplatesList(params),
        ...options,
    });
};

/**
 * Query hook for fetching all enabled secret templates
 */
export const useEnabledSecretTemplatesQuery = (options?: QueryOptionsUtil<SecretTemplate[]>) => {
    return useQuery({
        queryKey: ["secret-templates", "enabled"],
        queryFn: () => getEnabledSecretTemplates(),
        ...options,
    });
};

/**
 * Query hook for fetching all secret templates (including disabled)
 */
export const useAllSecretTemplatesQuery = (options?: QueryOptionsUtil<SecretTemplate[]>) => {
    return useQuery({
        queryKey: ["secret-templates", "all"],
        queryFn: () => getAllSecretTemplates(),
        ...options,
    });
};

/**
 * Query hook for fetching a single secret template detail
 */
export const useSecretTemplateDetailQuery = (
    id: string,
    options?: QueryOptionsUtil<SecretTemplate>,
) => {
    return useQuery({
        queryKey: ["secret-templates", "detail", id],
        queryFn: () => getSecretTemplateDetail(id),
        enabled: !!id,
        ...options,
    });
};

// Mutation Hooks

/**
 * Mutation hook for creating a secret template
 */
export const useCreateSecretTemplateMutation = (
    options?: MutationOptionsUtil<SecretTemplate, CreateSecretTemplateDto>,
) => {
    return useMutation({
        mutationFn: (data: CreateSecretTemplateDto) => createSecretTemplate(data),
        ...options,
    });
};

/**
 * Mutation hook for importing a secret template from JSON
 */
export const useImportSecretTemplateJsonMutation = (
    options?: MutationOptionsUtil<SecretTemplate, ImportSecretTemplateJsonDto>,
) => {
    return useMutation({
        mutationFn: (data: ImportSecretTemplateJsonDto) => importSecretTemplateJson(data),
        ...options,
    });
};

/**
 * Mutation hook for updating a secret template
 */
export const useUpdateSecretTemplateMutation = (
    options?: MutationOptionsUtil<SecretTemplate, { id: string; data: UpdateSecretTemplateDto }>,
) => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSecretTemplateDto }) =>
            updateSecretTemplate(id, data),
        ...options,
    });
};

/**
 * Mutation hook for setting secret template enabled status
 */
export const useSetSecretTemplateEnabledMutation = (
    options?: MutationOptionsUtil<SecretTemplate, { id: string; isEnabled: BooleanNumberType }>,
) => {
    return useMutation({
        mutationFn: ({ id, isEnabled }: { id: string; isEnabled: BooleanNumberType }) =>
            setSecretTemplateEnabled(id, isEnabled),
        ...options,
    });
};

/**
 * Mutation hook for deleting a secret template
 */
export const useDeleteSecretTemplateMutation = (
    options?: MutationOptionsUtil<{ message: string }, string>,
) => {
    return useMutation({
        mutationFn: (id: string) => deleteSecretTemplate(id),
        ...options,
    });
};

/**
 * Mutation hook for batch deleting secret templates
 */
export const useBatchDeleteSecretTemplatesMutation = (
    options?: MutationOptionsUtil<{ message: string; deleted: number }, string[]>,
) => {
    return useMutation({
        mutationFn: (ids: string[]) => batchDeleteSecretTemplates(ids),
        ...options,
    });
};

// ============================================================
// Secret (密钥配置) Types and Hooks
// ============================================================

export type QuerySecretDto = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    templateId?: string;
    status?: BooleanNumberType;
};

export type CreateSecretDto = {
    name: string;
    templateId: string;
    fieldValues: SecretFieldValue[];
    remark?: string;
    status?: BooleanNumberType;
    sortOrder?: number;
};

export type UpdateSecretDto = {
    name?: string;
    fieldValues?: SecretFieldValue[];
    remark?: string;
    status?: BooleanNumberType;
    sortOrder?: number;
};

export type SecretStats = {
    total: number;
    active: number;
    inactive: number;
};

// Secret API Functions

const getSecretsList = (params?: QuerySecretDto) =>
    consoleHttpClient.get<PaginatedResponse<Secret>>("secret", { params });

const getSecretsByTemplate = (templateId: string, onlyActive?: boolean) =>
    consoleHttpClient.get<Secret[]>(`secret/by-template/${templateId}`, {
        params: { onlyActive: onlyActive ? "true" : undefined },
    });

const getSecretStats = (templateId?: string) =>
    consoleHttpClient.get<SecretStats>("secret/stats", {
        params: templateId ? { templateId } : undefined,
    });

const getSecretDetail = (id: string) => consoleHttpClient.get<Secret>(`secret/${id}`);

const getSecretDetailFull = (id: string) => consoleHttpClient.get<Secret>(`secret/${id}/full`);

const createSecret = (data: CreateSecretDto) => consoleHttpClient.post<Secret>("secret", data);

const updateSecret = (id: string, data: UpdateSecretDto) =>
    consoleHttpClient.patch<Secret>(`secret/${id}`, data);

const setSecretStatus = (id: string, status: BooleanNumberType) =>
    consoleHttpClient.patch<Secret>(`secret/${id}/status`, { status });

const deleteSecret = (id: string) => consoleHttpClient.delete<{ message: string }>(`secret/${id}`);

const batchDeleteSecrets = (ids: string[]) =>
    consoleHttpClient.delete<{ message: string; deleted: number }>("secret", {
        data: { ids },
    });

// Secret Query Hooks

/**
 * Query hook for fetching paginated secrets list
 */
export const useSecretsListQuery = (
    params?: QuerySecretDto,
    options?: PaginatedQueryOptionsUtil<Secret>,
) => {
    return useQuery({
        queryKey: ["secrets", "list", params],
        queryFn: () => getSecretsList(params),
        ...options,
    });
};

/**
 * Query hook for fetching secrets by template ID
 */
export const useSecretsByTemplateQuery = (
    templateId: string,
    onlyActive?: boolean,
    options?: QueryOptionsUtil<Secret[]>,
) => {
    return useQuery({
        queryKey: ["secrets", "by-template", templateId, onlyActive],
        queryFn: () => getSecretsByTemplate(templateId, onlyActive),
        enabled: !!templateId,
        ...options,
    });
};

/**
 * Query hook for fetching secret stats
 */
export const useSecretStatsQuery = (
    templateId?: string,
    options?: QueryOptionsUtil<SecretStats>,
) => {
    return useQuery({
        queryKey: ["secrets", "stats", templateId],
        queryFn: () => getSecretStats(templateId),
        ...options,
    });
};

/**
 * Query hook for fetching a single secret detail
 */
export const useSecretDetailQuery = (id: string, options?: QueryOptionsUtil<Secret>) => {
    return useQuery({
        queryKey: ["secrets", "detail", id],
        queryFn: () => getSecretDetail(id),
        enabled: !!id,
        ...options,
    });
};

/**
 * Query hook for fetching a single secret detail with full info
 */
export const useSecretDetailFullQuery = (id: string, options?: QueryOptionsUtil<Secret>) => {
    return useQuery({
        queryKey: ["secrets", "detail-full", id],
        queryFn: () => getSecretDetailFull(id),
        enabled: !!id,
        ...options,
    });
};

// Secret Mutation Hooks

/**
 * Mutation hook for creating a secret
 */
export const useCreateSecretMutation = (options?: MutationOptionsUtil<Secret, CreateSecretDto>) => {
    return useMutation({
        mutationFn: (data: CreateSecretDto) => createSecret(data),
        ...options,
    });
};

/**
 * Mutation hook for updating a secret
 */
export const useUpdateSecretMutation = (
    options?: MutationOptionsUtil<Secret, { id: string; data: UpdateSecretDto }>,
) => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSecretDto }) => updateSecret(id, data),
        ...options,
    });
};

/**
 * Mutation hook for setting secret status
 */
export const useSetSecretStatusMutation = (
    options?: MutationOptionsUtil<Secret, { id: string; status: BooleanNumberType }>,
) => {
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: BooleanNumberType }) =>
            setSecretStatus(id, status),
        ...options,
    });
};

/**
 * Mutation hook for deleting a secret
 */
export const useDeleteSecretMutation = (
    options?: MutationOptionsUtil<{ message: string }, string>,
) => {
    return useMutation({
        mutationFn: (id: string) => deleteSecret(id),
        ...options,
    });
};

/**
 * Mutation hook for batch deleting secrets
 */
export const useBatchDeleteSecretsMutation = (
    options?: MutationOptionsUtil<{ message: string; deleted: number }, string[]>,
) => {
    return useMutation({
        mutationFn: (ids: string[]) => batchDeleteSecrets(ids),
        ...options,
    });
};
