/**
 * @fileoverview Console API service functions for AI provider management
 * @description This file contains API functions for AI provider management,
 * model configuration, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Base Type Definitions ====================

/**
 * Base provider interface
 * @description Common properties for all provider-related interfaces
 */
export interface BaseProvider {
    /** Provider ID */
    id: string;
    /** Provider identifier */
    provider: string;
    /** Provider name */
    name: string;
    /** Whether provider is active */
    isActive: boolean;
    /** Sort order */
    sortOrder: number;
    /** Creation time */
    createdAt: string;
    /** Update time */
    updatedAt: string;
}

/**
 * Base model interface
 * @description Common properties for all model-related interfaces
 */
export interface BaseModel {
    /** Model ID */
    id: string;
    /** Model name */
    name: string;
    /** Provider ID */
    providerId: string;
    /** Model identifier */
    model: string;
    /** Whether model is active */
    isActive: boolean;
    /** Whether model is default */
    isDefault: boolean;
    /** Model description */
    description?: string;
    /** Sort order */
    sortOrder: number;
    /** Creation time */
    createdAt: string;
    /** Update time */
    updatedAt: string;
}

/**
 * Billing rule interface
 * @description Standard billing rule structure
 */
export interface BillingRule {
    /** Computing power */
    power: number;
    /** Token count */
    tokens: number;
}

/**
 * Pricing information interface
 * @description Standard pricing information structure
 */
export interface PricingInfo {
    /** Input price */
    input?: number;
    /** Output price */
    output?: number;
    /** Currency unit */
    currency?: string;
}

// ==================== Type Definitions ====================

/**
 * AI provider information interface
 * @description Interface for AI provider information with all properties
 */
export interface AiProviderInfo extends BaseProvider {
    /** API key */
    apiKey: string;
    /** Base URL */
    baseUrl: string;
    /** Icon URL */
    iconUrl?: string;
    /** Website URL */
    websiteUrl?: string;
    /** Description information */
    description?: string;
    /** Global configuration */
    modelConfig?: ModelConfigItem[];
    /** Supported model types */
    supportedModelTypes: string[];
    /** Whether provider is built-in */
    isBuiltIn: boolean;
    /** Model list */
    models: ModelConfigItem[];
}

/**
 * Create AI provider request parameters interface
 * @description Parameters for creating a new AI provider
 */
export interface CreateAiProviderRequest {
    /** Provider identifier */
    provider: string;
    /** Provider name */
    name: string;
    /** API key configuration ID */
    bindSecretId: string;
    /** Icon URL */
    iconUrl?: string;
    /** Website URL */
    websiteUrl?: string;
    /** Description information */
    description?: string;
    /** Whether provider is active */
    isActive?: boolean;
    /** Sort order */
    sortOrder?: number;
    /** Supported model types */
    supportedModelTypes?: string[];
}

/**
 * Update AI provider request parameters interface
 * @description Parameters for updating an existing AI provider
 */
export type UpdateAiProviderRequest = Partial<CreateAiProviderRequest>;

/**
 * Base query parameters interface
 * @description Common query parameters for all entities (without pagination)
 */
export interface BaseQueryParams {
    /** Keyword search filter */
    keyword?: string;
    /** Active status filter */
    isActive?: boolean;
}

/**
 * AI provider query parameters interface
 * @description Parameters for querying AI providers with filters (no pagination)
 */
export type AiProviderQueryParams = BaseQueryParams;

/**
 * AI model query request parameters interface
 * @description Parameters for querying AI models with filters
 */
export interface AiModelQueryRequest extends BaseQueryParams {
    /** Provider ID filter */
    providerId?: string;
    /** Default model filter */
    isDefault?: boolean;
    /** Model capability filter */
    capability?: string;
    /** Model type filter */
    modelType?: string[];
}

/**
 * Base configuration item interface
 * @description Common properties for configuration parameter items
 */
export interface BaseConfigItem {
    /** Parameter value */
    value: any;
    /** Whether parameter is enabled */
    enable: boolean;
}

/**
 * Global configuration parameter item interface
 * @description Interface for global configuration parameter items
 */
export interface GlobalConfigItem extends BaseConfigItem {
    /** Parameter field name */
    field: string;
    /** Parameter title */
    title: string;
    /** Parameter description */
    description: string;
}

/**
 * Model configuration item interface
 * @description Interface for model configuration parameter items
 */
export interface ModelConfigItem extends BaseConfigItem {
    /** Parameter name */
    name: string;
    /** Parameter alias */
    alias: string;
}

/**
 * AI model information interface
 * @description Interface for AI model information with all properties
 */
export interface AiModelInfo extends BaseModel {
    /** Model configuration */
    modelConfig: ModelConfigItem[];
    /** Model type */
    modelType: string;
    /** Maximum context length */
    maxContext: number;
    /** Billing rule information */
    billingRule: BillingRule;
}

/**
 * Provider information interface (including model list)
 * @description Interface for provider information with model list
 */
export interface ProviderInfo extends BaseProvider {
    /** Model count */
    modelCount: number;
    /** Model list */
    models: AiModelInfo[];
}

/**
 * Create AI model request parameters interface
 * @description Parameters for creating a new AI model
 */
export interface CreateAiModelRequest {
    /** Model name */
    name: string;
    /** Provider ID */
    providerId: string;
    /** Model identifier */
    model: string;
    /** Maximum token count */
    maxTokens?: number;
    /** Model configuration */
    modelConfig?: ModelConfigItem[];
    /** Whether model is active */
    isActive?: boolean;
    /** Whether model is default */
    isDefault?: boolean;
    /** Model description */
    description?: string;
    /** Sort order */
    sortOrder?: number;
    /** Pricing information */
    pricing?: PricingInfo;
}

/**
 * Update AI model request parameters interface
 * @description Parameters for updating an existing AI model
 */
export type UpdateAiModelRequest = Partial<CreateAiModelRequest> & {
    /** Model ID (required for updates) */
    id: string;
};

/**
 * Model type interface
 * @description Interface for model type information
 */
export interface ModelType {
    /** Model type value */
    value: string;
    /** Model type label */
    label: string;
    /** Model type description */
    description: string;
}

// ==================== AI Provider Query Related APIs ====================

/**
 * Get AI provider list
 * @description Get AI provider list based on query conditions
 * @param params Query parameters
 * @returns Promise with provider list
 */
export function apiGetAiProviderList(params?: AiProviderQueryParams): Promise<AiProviderInfo[]> {
    return useConsoleGet("/ai-providers", params);
}

/**
 * Get AI provider detail
 * @description Get basic AI provider detail information by provider ID
 * @param id Provider ID
 * @returns Promise with provider detail information
 */
export function apiGetAiProviderDetail(id: string): Promise<AiProviderInfo> {
    return useConsoleGet(`/ai-providers/${id}`);
}

/**
 * Get AI provider full detail (including sensitive information)
 * @description Get complete AI provider detail including sensitive information like API keys
 * @param id Provider ID
 * @returns Promise with complete provider detail information
 */
export function apiGetAiProviderFullDetail(id: string): Promise<AiProviderInfo> {
    return useConsoleGet(`/ai-providers/${id}/full`);
}

// ==================== AI Provider Management Related APIs ====================

/**
 * Create AI provider
 * @description Create new AI provider configuration
 * @param data Provider creation data
 * @returns Promise with created provider information
 */
export function apiCreateAiProvider(data: CreateAiProviderRequest): Promise<AiProviderInfo> {
    return useConsolePost("/ai-providers", data);
}

/**
 * Update AI provider
 * @description Update AI provider configuration information by provider ID
 * @param id Provider ID
 * @param data Update data
 * @returns Promise with updated provider information
 */
export function apiUpdateAiProvider(
    id: string,
    data: UpdateAiProviderRequest,
): Promise<AiProviderInfo> {
    return useConsolePatch(`/ai-providers/${id}`, data);
}

/**
 * Delete AI provider
 * @description Delete specified AI provider configuration by provider ID
 * @param id Provider ID
 * @returns Promise with deletion result
 */
export function apiDeleteAiProvider(id: string): Promise<void> {
    return useConsoleDelete(`/ai-providers/${id}`);
}

/**
 * Batch delete AI providers
 * @description Delete multiple AI providers by provider ID array
 * @param ids Array of provider IDs
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteAiProviders(ids: string[]): Promise<void> {
    return useConsoleDelete("/ai-providers", { ids });
}

// ==================== AI Provider Operations Related APIs ====================

/**
 * Test AI provider connection
 * @description Test connection status and availability of specified AI provider
 * @param id Provider ID
 * @returns Promise with test result
 */
export function apiTestAiProviderConnection(
    id: string,
): Promise<{ success: boolean; message: string }> {
    return useConsolePost(`/ai-providers/${id}/test-connection`);
}

/**
 * Toggle AI provider active status
 * @description Toggle active/inactive status of specified AI provider
 * @param id Provider ID
 * @param isActive Whether to activate the provider
 * @returns Promise with updated provider information
 */
export function apiToggleAiProviderActive(id: string, isActive: boolean): Promise<AiProviderInfo> {
    return useConsolePatch(`/ai-providers/${id}/toggle-active`, { isActive });
}

/**
 * Get AI provider model types
 * @description Get list of model types supported by AI providers
 * @returns Promise with model type list
 */
export function apiGetAiProviderModelTypes(): Promise<ModelType[]> {
    return useConsoleGet("/ai-models/type/list");
}
