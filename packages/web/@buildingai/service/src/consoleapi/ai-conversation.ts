/**
 * @fileoverview Console API service functions for AI conversation management
 * @description This file contains API functions for AI conversation management,
 * message handling, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseQueryParams, Pagination, PaginationResult } from "../models/globals";
import type { AiMessage } from "../models/message";
import type { AiConversation, ChatConfig, ConversationStatus } from "../webapi/ai-conversation";

// ==================== Type Definitions ====================

/**
 * Update chat configuration request parameters interface
 * @description Parameters for updating chat configuration settings
 */
export type UpdateChatConfigDto = Partial<ChatConfig>;

/**
 * Conversation query parameters interface
 * @description Parameters for querying conversations with filters (for console use)
 */
export interface ConversationQueryParams extends BaseQueryParams {
    /** Conversation status filter */
    status?: ConversationStatus;
    /** Pinned status filter */
    isPinned?: boolean;
    /** User ID filter */
    userId?: string;
}

// ==================== Conversation Query Related APIs ====================

/**
 * Get conversation list
 * @description Get paginated list of AI conversations based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated conversation list result
 */
export function apiGetConversationList(
    params?: ConversationQueryParams,
): Promise<PaginationResult<AiConversation[]>> {
    return useConsoleGet("/ai-conversations", params);
}

/**
 * Get conversation detail
 * @description Get detailed conversation information by conversation ID
 * @param id Conversation ID
 * @returns Promise with conversation detail information
 */
export function apiGetConversationDetail(id: string): Promise<AiConversation> {
    return useConsoleGet(`/ai-conversations/${id}`);
}

/**
 * Get conversation messages
 * @description Get paginated list of messages for a specific conversation
 * @param conversationId Conversation ID
 * @param params Pagination parameters
 * @returns Promise with paginated message list result
 */
export function apiGetConversationMessages(
    conversationId: string,
    params?: Pagination,
): Promise<PaginationResult<AiMessage[]>> {
    return useConsoleGet(`/ai-conversations/${conversationId}/messages`, params);
}

// ==================== Conversation Management Related APIs ====================

/**
 * Delete conversation
 * @description Delete specified AI conversation by conversation ID
 * @param id Conversation ID
 * @returns Promise with deletion result
 */
export function apiDeleteConversation(id: string): Promise<void> {
    return useConsoleDelete(`/ai-conversations/${id}`);
}

/**
 * Batch delete conversations
 * @description Delete multiple AI conversations by conversation ID array
 * @param ids Array of conversation IDs
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteConversations(ids: string[]): Promise<void> {
    return useConsolePost("/ai-conversations/batch-delete", { ids });
}

// ==================== Conversation Operations Related APIs ====================

/**
 * Toggle conversation pin status
 * @description Set or unset conversation pin status
 * @param id Conversation ID
 * @param isPinned Whether to pin the conversation
 * @returns Promise with operation result
 */
export function apiToggleConversationPin(id: string, isPinned: boolean): Promise<void> {
    return useConsolePut(`/ai-conversations/${id}/pin`, { isPinned });
}

// ==================== Chat Configuration Related APIs ====================

/**
 * Get chat configuration
 * @description Get current chat page configuration information (suggestion options and welcome information)
 * @returns Promise with chat configuration information
 */
export function apiGetChatConfig(): Promise<ChatConfig> {
    return useConsoleGet("/ai-conversations/config");
}

/**
 * Update chat configuration
 * @description Update chat page configuration information (suggestion options and welcome information)
 * @param data Update data
 * @returns Promise with updated configuration information
 */
export function apiUpdateChatConfig(data: UpdateChatConfigDto): Promise<ChatConfig> {
    return useConsolePut("/ai-conversations/config", data);
}
