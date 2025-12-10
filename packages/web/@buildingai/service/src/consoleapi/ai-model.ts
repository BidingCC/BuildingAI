/**
 * @fileoverview Console API service functions for AI model management
 * @description This file contains API functions for AI model management,
 * model configuration, and related operations for the console.
 *
 * @author BuildingAI Teams
 */

import type {
    AiModelInfo,
    AiModelQueryRequest,
    CreateAiModelRequest,
    UpdateAiModelRequest,
} from "./ai-provider";

// ==================== AI Model Query Related APIs ====================

/**
 * Get AI model list (no pagination)
 * @description Get all AI model list based on query conditions
 * @param params Query parameters
 * @returns Promise with model list
 */
export function apiGetAiModelList(params: AiModelQueryRequest): Promise<AiModelInfo[]> {
    return useConsoleGet("/ai-models", params);
}

/**
 * Get AI model detail
 * @description Get basic AI model detail information by model ID
 * @param id AI model ID
 * @returns Promise with AI model detail information
 */
export function apiGetAiModelDetail(id: string): Promise<AiModelInfo> {
    return useConsoleGet(`/ai-models/${id}`);
}

/**
 * Get AI model full detail (including sensitive information)
 * @description Get complete AI model detail including sensitive information like API keys
 * @param id AI model ID
 * @returns Promise with complete AI model detail information
 */
export function apiGetAiModelFullDetail(id: string): Promise<AiModelInfo> {
    return useConsoleGet(`/ai-models/${id}/full`);
}

/**
 * Get models by capability
 * @description Filter available AI model list by specified capability type
 * @param capability Capability type
 * @returns Promise with model list
 */
export function apiGetModelsByCapability(capability: string): Promise<AiModelInfo[]> {
    return useConsoleGet(`/ai-models/capability/${capability}`);
}

/**
 * Get available model list (non-paginated)
 * @description Get all available AI model list without pagination
 * @returns Promise with available model list
 */
export function apiGetAvailableModels(): Promise<AiModelInfo[]> {
    return useConsoleGet("/ai-models/available/all");
}

/**
 * Get default model
 * @description Get current system default AI model
 * @returns Promise with default model information
 */
export function apiGetDefaultModel(): Promise<AiModelInfo> {
    return useConsoleGet("/ai-models/default/current", { requireAuth: true });
}

// ==================== AI Model Management Related APIs ====================

/**
 * Create AI model
 * @description Create new AI model configuration
 * @param data Creation data
 * @returns Promise with created model information
 */
export function apiCreateAiModel(data: CreateAiModelRequest): Promise<AiModelInfo> {
    return useConsolePost("/ai-models", data);
}

/**
 * Update AI model
 * @description Update AI model configuration information by model ID
 * @param id AI model ID
 * @param data Update data
 * @returns Promise with updated model information
 */
export function apiUpdateAiModel(id: string, data: UpdateAiModelRequest): Promise<AiModelInfo> {
    return useConsolePatch(`/ai-models/${id}`, data);
}

/**
 * Set AI model status
 * @description Set AI model status by model ID
 * @param id AI model ID
 * @param isActive Model status
 * @returns Promise with operation result
 */
export function apiSetAiModelIsActive(id: string, isActive: boolean): Promise<void> {
    return useConsolePatch(`/ai-models/${id}/toggle-active`, { isActive });
}

/**
 * Batch update AI models
 * @description Batch update AI model configuration information by model IDs
 * @param models Update data array
 * @returns Promise with updated model information list
 */
export function apiBatchUpdateAiModel(models: UpdateAiModelRequest[]): Promise<AiModelInfo[]> {
    return useConsolePatch(`/ai-models/batch/update`, { models });
}

/**
 * Batch set AI model status
 * @description Batch set AI model status by model IDs
 * @param ids Array of AI model IDs
 * @param isActive Model status
 * @returns Promise with operation result
 */
export function apiBatchSetAiModelIsActive(ids: string[], isActive: boolean): Promise<void> {
    return useConsolePatch(`/ai-models/batch-toggle-active`, { ids, isActive });
}

/**
 * Delete AI model
 * @description Delete specified AI model configuration by model ID
 * @param id AI model ID
 * @returns Promise with deletion result
 */
export function apiDeleteAiModel(id: string): Promise<void> {
    return useConsoleDelete(`/ai-models/${id}`);
}

/**
 * Batch delete AI models
 * @description Batch delete multiple AI models by model ID array
 * @param ids Array of AI model IDs
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteAiModel(ids: string[]): Promise<void> {
    return useConsoleDelete("/ai-models", { ids });
}

// ==================== AI Model Operations Related APIs ====================

/**
 * Set default model
 * @description Set specified AI model as system default model
 * @param id AI model ID
 * @returns Promise with operation result
 */
export function apiSetDefaultModel(id: string): Promise<void> {
    return useConsolePut(`/ai-models/${id}/default`, {});
}

/**
 * Get parent model type limits
 * @description Get parent model type limitations for specified provider
 * @param params Query parameters
 * @returns Promise with parent model type list
 */
export function apiGetParentModelTypeLimit(params: { providerId: string }): Promise<string[]> {
    return useConsoleGet("/ai-models/type-father/list", params);
}
