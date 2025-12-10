/**
 * @fileoverview Web API service functions for AI conversation management
 * @description This file contains API functions for AI conversation management,
 * message handling, and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type { ChatStreamConfig } from "@buildingai/types";

import type {
    BaseCreateRequest,
    BaseEntity,
    ModelType,
    Pagination,
    PaginationResult,
} from "../models/globals";
import type { AiMessage } from "../models/message";
import type { UserInfo } from "./user";

// ==================== Type Definitions ====================

/**
 * Conversation status enumeration
 * @description Status types for AI conversations
 */
export type ConversationStatus = "active" | "completed" | "failed";

/**
 * Message role enumeration
 * @description Role types for messages in conversations
 */
type _MessageRole = "user" | "assistant" | "system";

/**
 * Message type enumeration
 * @description Content types for messages
 */
type _MessageType = "text" | "image" | "file";

/**
 * AI conversation record interface
 * @description Interface for AI conversation information with all conversation properties
 */
export interface AiConversation extends BaseEntity {
    /** Conversation title */
    title: string;
    /** User ID */
    userId: string;
    /** Conversation summary */
    summary?: string;
    /** Total message count */
    messageCount: number;
    /** Total token consumption */
    totalTokens: number;
    /** Total power consumption */
    totalPower: number;
    /** Conversation configuration */
    config?: Record<string, unknown>;
    /** Conversation status */
    status: ConversationStatus;
    /** Whether conversation is pinned */
    isPinned: boolean;
    /** Whether conversation is deleted (soft delete) */
    isDeleted: boolean;
    /** Extended data */
    metadata?: Record<string, unknown>;
    /** User information */
    user?: UserInfo;
    /** Message list in conversation */
    messages?: AiMessage[];
}

/**
 * Create conversation request parameters
 * @description Parameters for creating a new AI conversation
 */
export interface CreateConversationParams extends BaseCreateRequest<AiConversation> {
    /** First message (optional) */
    firstMessage?: {
        /** Message content */
        content: string;
        /** AI model ID (optional) */
        modelId?: string;
    };
}

/**
 * Update conversation request parameters
 * @description Parameters for updating an existing AI conversation
 * Inherits from create request with all fields optional, but ID is required
 */
export interface UpdateConversationParams extends Partial<AiConversation> {
    /** First message (optional) */
    firstMessage?: {
        /** Message content */
        content: string;
        /** AI model ID (optional) */
        modelId?: string;
    };
}

/**
 * Quick menu configuration interface
 * @description Interface for quick menu configuration items
 */
export interface QuickMenu extends BaseEntity {
    name: string;
    alias: string;
    description: string;
    icon: string;
    type: string;
    url: string;
    timeout: number;
    providerIcon: null;
    providerName: string;
    providerUrl: null;
    sortOrder: number;
    connectable: boolean;
    connectError: string;
    isDisabled: boolean;
    creatorId: null;
}

/**
 * AI model interface
 * @description Interface for AI model information
 */
export interface AiModel extends BaseEntity {
    name: string;
    providerId: string;
    model: string;
    maxTokens: number;
    maxContext: number;
    modelConfig: Record<string, unknown>;
    isActive: boolean;
    isDefault: boolean;
    description?: string;
    sortOrder: number;
    modelType?: string;
    features?: string[];
    billingRule: {
        power: number;
        tokens: number;
    };
}

/**
 * AI provider interface
 * @description Interface for AI provider information
 */
export interface AiProvider extends BaseEntity {
    provider: string;
    name: string;
    baseUrl: string;
    iconUrl?: string;
    websiteUrl?: string;
    isActive: boolean;
    description?: string;
    sortOrder: number;
    models: AiModel[];
}

/**
 * Chat suggestion interface
 * @description Interface for chat suggestion items
 */
export interface ChatSuggestion {
    /** Suggestion text */
    text: string;
    /** Suggestion icon */
    icon?: string;
}

/**
 * Welcome information interface
 * @description Interface for welcome information
 */
export interface WelcomeInfo {
    /** Welcome title */
    title: string;
    /** Welcome description */
    description: string;
    /** Welcome icon */
    icon?: string;
    /** Welcome footer */
    footer?: string;
}

/**
 * Chat configuration interface
 * @description Interface for chat configuration settings
 */
export interface ChatConfig {
    /** Chat suggestion options */
    suggestions: ChatSuggestion[];
    /** Attachment size limit in bytes */
    attachmentSizeLimit: number;
    /** Whether suggestion options are enabled */
    suggestionsEnabled: boolean;
    /** Welcome information */
    welcomeInfo: WelcomeInfo;
}

/**
 * Text optimization request parameters
 * @description Parameters for text optimization request
 */
export interface TextOptimizationRequest {
    /** AI model ID (optional, uses default model if not provided) */
    modelId?: string;
    /** Original text content (required) */
    text: string;
    /** Optimization style or direction (optional) */
    /** e.g., concise, vivid, professional, colloquial, etc. */
    optimizationStyle?: string;
    /** Custom optimization requirements (optional) */
    requirements?: string;
}

/**
 * Text optimization response
 * @description Response data for text optimization
 */
export interface TextOptimizationResponse {
    /** Original text */
    originalText: string;
    /** Optimized text */
    optimizedText: string;
    /** Token usage information */
    tokens: {
        /** Prompt tokens */
        prompt_tokens?: number;
        /** Completion tokens */
        completion_tokens?: number;
        /** Total tokens */
        total_tokens?: number;
    };
    /** User consumed power */
    userConsumedPower: number;
}

// ==================== Provider Related APIs ====================

/**
 * Get enabled AI provider list
 * @description Retrieves list of enabled AI providers with model information
 * @returns Promise with provider list containing model information
 */
export function apiGetAiProviders(params?: { supportedModelTypes?: ModelType[] }): Promise<any[]> {
    return useWebGet("/ai-providers", params, { dedupe: false });
}

/**
 * Get specified provider details
 * @description Retrieves detailed information for a specific AI provider
 * @param id Provider ID
 * @returns Promise with provider detailed information
 */
export function apiGetAiProvider(id: string): Promise<any> {
    return useWebGet(`/ai-providers/${id}`);
}

/**
 * Get provider by provider code
 * @description Retrieves provider information by provider code
 * @param providerCode Provider code (e.g., openai, anthropic, etc.)
 * @returns Promise with provider information
 */
export function apiGetProviderByCode(providerCode: string): Promise<any> {
    return useWebGet(`/ai-providers/by-code/${providerCode}`);
}

/**
 * Filter providers by capability
 * @description Retrieves providers that support a specific capability
 * @param capability Capability type (e.g., chat, image_generation, etc.)
 * @returns Promise with list of providers supporting the capability
 */
export function apiGetAiProvidersByCapability(capability: string): Promise<any[]> {
    return useWebGet(`/ai-providers/capability/${capability}`);
}

/**
 * Get provider's model list
 * @description Retrieves list of models for a specific provider
 * @param providerKey Provider identifier
 * @param capability Optional capability filter
 * @returns Promise with list of models under the provider
 */
export function apiGetProviderModels(providerKey: string, capability?: string): Promise<any[]> {
    const params = capability ? { capability } : undefined;
    return useWebGet(`/ai-providers/${providerKey}/models`, params);
}

// ==================== Model Related APIs ====================

/**
 * Get available model list for user
 * @description Retrieves list of models available to the user
 * @returns Promise with model list
 */
export function apiGetAiModels(): Promise<AiModel[]> {
    return useWebGet("/ai-models");
}

/**
 * Get model detailed information
 * @description Retrieves detailed information for a specific model
 * @param id Model ID
 * @returns Promise with model detailed information
 */
export function apiGetAiModel(id: string): Promise<AiModel> {
    return useWebGet(`/ai-models/${id}`);
}

/**
 * Get default model
 * @description Retrieves the default model information
 * @returns Promise with default model information
 */
export function apiGetDefaultAiModel(): Promise<AiModel> {
    return useWebGet("/ai-models/default/current");
}

/**
 * Filter models by capability
 * @description Retrieves models that support a specific capability
 * @param capability Model capability
 * @returns Promise with list of models matching the criteria
 */
export function apiGetAiModelsByCapability(capability: string): Promise<AiModel[]> {
    return useWebGet(`/ai-models/capability/${capability}`);
}

/**
 * Get conversation records (paginated)
 * @description Retrieves paginated list of AI conversations
 * @param params Pagination information
 * @returns Promise with paginated results
 */
export function apiGetAiConversationList(
    params: Pagination,
): Promise<PaginationResult<AiConversation>> {
    return useWebGet("/ai-conversations", params, { requireAuth: true });
}

/**
 * Get conversation details
 * @description Retrieves detailed information for a specific conversation
 * @param id Conversation ID
 * @returns Promise with conversation details
 */
export function apiGetAiConversationDetail(id: string): Promise<AiConversation> {
    return useWebGet(`/ai-conversations/${id}`);
}

/**
 * Create new conversation
 * @description Creates a new AI conversation
 * @param data Conversation creation data
 * @returns Promise with created conversation information
 */
export function apiCreateAiConversation(data: { title: string }): Promise<AiConversation> {
    return useWebPost("/ai-conversations", data);
}

/**
 * Update conversation record
 * @description Updates an existing AI conversation
 * @param id Record ID
 * @param data Update data
 * @returns Promise with update result
 */
export function apiUpdateAiConversation(
    id: string,
    data: UpdateConversationParams,
): Promise<AiConversation> {
    return useWebPatch(`/ai-conversations/${id}`, data);
}

/**
 * Delete conversation record
 * @description Deletes an AI conversation
 * @param id Record ID
 * @returns Promise with deletion result
 */
export function apiDeleteAiConversation(id: string): Promise<void> {
    return useWebDelete(`/ai-conversations/${id}`);
}

/**
 * Get conversation messages (paginated)
 * @description Retrieves paginated list of messages in a conversation
 * @param id Conversation ID
 * @param params Pagination information
 * @returns Promise with paginated message results
 */
export function apiGetAiConversation(
    id: string,
    params: Pagination,
): Promise<PaginationResult<AiMessage>> {
    return useWebGet(`/ai-conversations/${id}/messages`, params);
}

/**
 * Start streaming chat
 * @description Initiates a streaming chat session with AI
 * @param messages Message list
 * @param config Stream configuration
 * @param _mcpServers MCP servers (unused parameter)
 * @returns Promise with stream controller
 */
export function apiChatStream(
    messages: AiMessage[] | any,
    config?: Partial<ChatStreamConfig>,
    _mcpServers?: string[],
): Promise<{ abort: () => void }> {
    return useWebStream("/ai-chat/stream", { ...config, messages });
}

/**
 * Optimize text content
 * @description Optimizes text content using AI (non-streaming)
 * @param data Text optimization request parameters
 * @returns Promise with optimization result
 */
export function apiOptimizeText(data: TextOptimizationRequest): Promise<TextOptimizationResponse> {
    return useWebPost("/ai-chat/optimize-text", data);
}

// ==================== Chat Configuration Related APIs ====================

/**
 * Get chat configuration
 * @description Retrieves frontend chat page configuration information (suggestion options and welcome information)
 * @returns Promise with chat configuration information
 */
export function apiGetChatConfig(): Promise<ChatConfig> {
    return useWebGet("/config/chat");
}

// ==================== Quick Menu Related APIs ====================

/**
 * Get quick menu configuration
 * @description Retrieves frontend quick menu configuration information
 * @returns Promise with quick menu configuration information
 */
export function apiGetQuickMenu(): Promise<QuickMenu> {
    return useWebGet("/ai-mcp-servers/quick-menu", {});
}
