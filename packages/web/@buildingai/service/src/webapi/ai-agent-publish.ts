/**
 * @fileoverview Web API service functions for AI agent publishing
 * @description This file contains API functions for AI agent publishing,
 * public API access, conversation management, and related type definitions for the web interface.
 *
 * @author BuildingAI Teams
 */

import type {
    Agent,
    CreateAgentAnnotationParams,
    UpdateAgentAnnotationParams,
} from "../consoleapi/ai-agent";
import type { PaginationResult } from "../models/globals";
import type { AiMessage } from "../models/message";

// ==================== Type Definitions ====================

/**
 * Publish configuration interface
 * @description Configuration settings for agent publishing
 */
export interface PublishConfig {
    /** Allowed origins for CORS */
    allowOrigins?: string[];
    /** Rate limit per minute */
    rateLimitPerMinute?: number;
    /** Whether to show branding */
    showBranding?: boolean;
    /** Whether to allow downloading conversation history */
    allowDownloadHistory?: boolean;
}

/**
 * Publish agent request parameters interface
 * @description Parameters for publishing an agent
 */
export interface PublishAgentParams {
    /** Publish configuration */
    publishConfig?: PublishConfig;
}

/**
 * Publish agent response interface
 * @description Response data after publishing an agent
 */
export interface PublishAgentResponse {
    /** Publish token for public access */
    publishToken: string;
    /** API key for authentication */
    apiKey: string;
    /** Public URL for the published agent */
    publishUrl: string;
    /** Embed code for integration */
    embedCode: string;
}

/**
 * Embed code response interface
 * @description Response data for embed code generation
 */
export interface EmbedCodeResponse {
    /** Embed code for integration */
    embedCode: string;
    /** Public URL for the published agent */
    publishUrl: string;
}

/**
 * Regenerate API key response interface
 * @description Response data after regenerating API key
 */
export interface RegenerateApiKeyResponse {
    /** New API key */
    apiKey: string;
}

// ==================== Agent Publishing Related APIs ====================

/**
 * Publish agent
 * @description Publish an agent for public access
 * @param agentId Agent ID
 * @param params Publish parameters
 * @returns Promise with publish response data
 */
export function apiPublishAgent(
    agentId: string,
    params: PublishAgentParams = {},
): Promise<PublishAgentResponse> {
    return useConsolePost(`/ai-agent/${agentId}/publish`, params);
}

/**
 * Unpublish agent
 * @description Unpublish an agent to remove public access
 * @param agentId Agent ID
 * @returns Promise with operation result
 */
export function apiUnpublishAgent(agentId: string): Promise<{ message: string }> {
    return useConsolePost(`/ai-agent/${agentId}/unpublish`, {});
}

/**
 * Regenerate API key
 * @description Generate a new API key for the published agent
 * @param agentId Agent ID
 * @returns Promise with new API key
 */
export function apiRegenerateApiKey(agentId: string): Promise<RegenerateApiKeyResponse> {
    return useConsolePost(`/ai-agent/${agentId}/regenerate-api-key`, {});
}

/**
 * Get embed code
 * @description Get embed code for integrating the published agent
 * @param agentId Agent ID
 * @returns Promise with embed code data
 */
export function apiGetEmbedCode(agentId: string): Promise<EmbedCodeResponse> {
    return useConsoleGet(`/ai-agent/${agentId}/embed-code`);
}

// ==================== V1 Public API ====================

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
            requireAuth: false,
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
            requireAuth: false,
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
): Promise<any> {
    return useConsoleGet(`/v1/${publishToken}/conversations`, params, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: false,
    });
}

/**
 * Get conversation list (using API key)
 * @description Get list of conversations using API key authentication
 * @param apiKey API key
 * @param params Query parameters
 * @returns Promise with conversation list
 */
export function apiGetConversationsByApiKey(
    apiKey: string,
    params: { page?: number; pageSize?: number } = {},
): Promise<any> {
    return useConsoleGet(`/v1/conversations`, params, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        requireAuth: false,
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
        requireAuth: false,
    });
}

/**
 * Get conversation messages (using API key)
 * @description Get messages from a conversation using API key authentication
 * @param apiKey API key
 * @param conversationId Conversation ID
 * @param params Query parameters
 * @returns Promise with paginated message list
 */
export function apiGetMessagesByApiKey(
    apiKey: string,
    conversationId: string,
    params: { page?: number; pageSize?: number } = {},
): Promise<PaginationResult<AiMessage>> {
    return useConsoleGet(`/v1/conversations/${conversationId}/messages`, params, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        requireAuth: false,
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
): Promise<any> {
    return useConsoleDelete(`/v1/${publishToken}/conversations/${conversationId}`, undefined, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: false,
    });
}

/**
 * Delete conversation (using API key)
 * @description Delete a conversation using API key authentication
 * @param apiKey API key
 * @param conversationId Conversation ID
 * @returns Promise with deletion result
 */
export function apiDeleteConversationByApiKey(
    apiKey: string,
    conversationId: string,
): Promise<any> {
    return useConsoleDelete(`/v1/conversations/${conversationId}`, undefined, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        requireAuth: false,
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
): Promise<any> {
    return useConsolePut(`/v1/${publishToken}/conversations/${conversationId}`, updateData, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: false,
    });
}

/**
 * Update conversation (using API key)
 * @description Update conversation information using API key authentication
 * @param apiKey API key
 * @param conversationId Conversation ID
 * @param updateData Update data
 * @returns Promise with update result
 */
export function apiUpdateConversationByApiKey(
    apiKey: string,
    conversationId: string,
    updateData: { title?: string },
): Promise<any> {
    return useConsolePut(`/v1/conversations/${conversationId}`, updateData, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        requireAuth: false,
    });
}

// ==================== 标注相关 API ====================

/**
 * 创建标注
 * @param publishToken 发布令牌
 * @param accessToken 访问令牌
 * @param data 创建标注数据
 * @returns 创建的标注
 */
export function apiCreateAnnotation(
    publishToken: string,
    accessToken: string,
    data: CreateAgentAnnotationParams,
): Promise<any> {
    return useConsolePost(`/v1/${publishToken}/annotations`, data, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: false,
    });
}

/**
 * 获取标注详情
 * @param publishToken 发布令牌
 * @param accessToken 访问令牌
 * @param annotationId 标注ID
 * @returns 标注详情
 */
export function apiGetAnnotationDetail(
    publishToken: string,
    accessToken: string,
    annotationId: string,
): Promise<any> {
    return useConsoleGet(
        `/v1/${publishToken}/annotations/${annotationId}`,
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            requireAuth: false,
        },
    );
}

/**
 * 更新标注
 * @param publishToken 发布令牌
 * @param accessToken 访问令牌
 * @param annotationId 标注ID
 * @param data 更新标注数据
 * @returns 更新后的标注
 */
export function apiUpdateAnnotation(
    publishToken: string,
    accessToken: string,
    annotationId: string,
    data: UpdateAgentAnnotationParams,
): Promise<any> {
    return useConsolePut(`/v1/${publishToken}/annotations/${annotationId}`, data, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: false,
    });
}

// ==================== 对话相关 API ====================

/**
 * 统一对话接口（支持流式和阻塞模式）
 * @param publishToken 发布令牌
 * @param accessToken 访问令牌
 * @param data 对话数据
 * @returns 对话结果或流控制器
 */
export function apiChat(
    publishToken: string,
    accessToken: string,
    data: {
        messages: AiMessage[];
        responseMode?: "streaming" | "blocking";
        conversationId?: string;
        title?: string;
        formVariables?: Record<string, string>;
        formFieldsInputs?: Record<string, any>;
        saveConversation?: boolean;
        includeReferences?: boolean;
    },
): Promise<any> {
    return useConsolePost(`/v1/${publishToken}/chat`, data, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        requireAuth: false,
    });
}

/**
 * API Key 方式对话
 * @param apiKey API密钥
 * @param data 对话数据
 * @returns 对话结果或流控制器
 */
export function apiChatByApiKey(
    apiKey: string,
    data: {
        messages: AiMessage[];
        responseMode?: "streaming" | "blocking";
        conversationId?: string;
        title?: string;
        formVariables?: Record<string, string>;
        formFieldsInputs?: Record<string, any>;
        saveConversation?: boolean;
        includeReferences?: boolean;
    },
): Promise<any> {
    return useConsolePost(`/v1/chat`, data, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
        requireAuth: false,
    });
}

/**
 * 流式对话（兼容 useChat）
 * @param messages 消息列表
 * @param config 对话配置（包含publishToken和accessToken）
 * @returns 流控制器
 */
export function apiChatStream(
    messages: AiMessage[] | any,
    config?: Partial<any>,
): Promise<{ abort: () => void }> {
    const publishToken = config?.body?.publishToken;
    const accessToken = config?.body?.accessToken;

    if (!publishToken) {
        throw new Error("Publish token is required");
    }
    if (!accessToken) {
        throw new Error("Access token is required");
    }

    delete config.body?.publishToken;
    delete config.body?.accessToken;

    return useConsoleStream(`/v1/${publishToken}/chat`, {
        ...config,
        messages,
        responseMode: "streaming",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...config?.headers,
        },
    });
}
