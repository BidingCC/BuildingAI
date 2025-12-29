/**
 * @fileoverview Web API service functions for AI agent management
 * @description This file contains API functions for AI agent management,
 * and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import type { PaginationResult } from "@buildingai/service/models/globals";
import type { AiMessage } from "@buildingai/service/models/message";
import type { QueryPublicAgentParams } from "@buildingai/service/webapi/ai-agent";
// ==================== Type Definitions ====================

/**
 * Get public agent list
 * @description Get paginated list of public agents with search and sorting support
 * @param params Query parameters
 * @returns Promise with paginated agent list
 */
export function apiGetPublicAgents(
    params: QueryPublicAgentParams,
): Promise<PaginationResult<Agent>> {
    return useWebGet("/ai-agents", params);
}

/**
 * Get agent information
 * @description Get public information of a published agent
 * @param publishToken Publish token
 * @param accessToken Access token (optional)
 * @returns Promise with agent public information
 */
export function apiGetAgentInfo(publishToken: string, accessToken?: string): Promise<Agent> {
    const headers: Record<string, string> = {};
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    return useConsoleGet(
        `/v1/${publishToken}/info`,
        {},
        {
            headers,
            requireAuth: true,
        },
    );
}

/**
 * Generate access token
 * @description Generate access token for agent interaction
 * @param publishToken Publish token
 * @returns Promise with access token information
 */
export function apiGenerateAccessToken(publishToken: string): Promise<{
    accessToken: string;
    agentId: string;
    agentName: string;
    description: string;
}> {
    return useConsolePost(
        `/v1/${publishToken}/generate-access-token`,
        {},
        {
            requireAuth: true,
        },
    );
}

/**
 * Get conversation list (using access token)
 * @description Get list of conversations using access token authentication
 * @param publishToken Publish token
 * @param accessToken Access token
 * @param params Query parameters
 * @returns Promise with conversation list
 */
export function apiGetConversations(
    publishToken: string,
    accessToken: string,
    params: { page?: number; pageSize?: number } = {},
): Promise<PaginationResult<Record<string, unknown>>> {
    return useConsoleGet(`/v1/${publishToken}/conversations`, params, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: true,
    });
}

/**
 * Get conversation messages (using access token)
 * @description Get messages from a conversation using access token authentication
 * @param publishToken Publish token
 * @param accessToken Access token
 * @param conversationId Conversation ID
 * @param params Query parameters
 * @returns Promise with paginated message list
 */
export function apiGetMessages(
    publishToken: string,
    accessToken: string,
    conversationId: string,
    params: { page?: number; pageSize?: number } = {},
): Promise<PaginationResult<AiMessage>> {
    return useConsoleGet(`/v1/${publishToken}/conversations/${conversationId}/messages`, params, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: true,
    });
}

/**
 * Update conversation (using access token)
 * @description Update conversation information using access token authentication
 * @param publishToken Publish token
 * @param accessToken Access token
 * @param conversationId Conversation ID
 * @param updateData Update data
 * @returns Promise with update result
 */
export function apiUpdateConversation(
    publishToken: string,
    accessToken: string,
    conversationId: string,
    updateData: { title?: string },
): Promise<Record<string, unknown>> {
    return useConsolePut(`/v1/${publishToken}/conversations/${conversationId}`, updateData, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: true,
    });
}

/**
 * Delete conversation (using access token)
 * @description Delete a conversation using access token authentication
 * @param publishToken Publish token
 * @param accessToken Access token
 * @param conversationId Conversation ID
 * @returns Promise with deletion result
 */
export function apiDeleteConversation(
    publishToken: string,
    accessToken: string,
    conversationId: string,
): Promise<Record<string, unknown>> {
    return useConsoleDelete(`/v1/${publishToken}/conversations/${conversationId}`, undefined, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: true,
    });
}
