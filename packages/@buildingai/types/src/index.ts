/**
 * @fileoverview Centralized type definitions for BuildingAI
 * @description This package contains shared type definitions to avoid circular dependencies
 * between packages. All common types should be defined here.
 *
 * @author BuildingAI Teams
 */

// Export HTTP related types
export * from "./http/mcp";
// Note: ChatMessage conflicts with ai/agent-config.interface.ts
export type { ChatMessage as HttpChatMessage } from "./http/types";
// Explicitly export ChatStreamConfig and ChatStreamChunk to ensure correct types
export type {
    ChatStreamChunk,
    ChatStreamConfig,
    ExtendedFetchOptions,
    HttpClient,
    HttpClientOptions,
    HttpMethod,
    Interceptor,
    InterceptorManager,
    RequestOptions,
    ResponseSchema,
    SSEConfig,
    UploadController,
    UploadOptions,
} from "./http/types";
export * from "./http/types";

// Export Analyse related types
// Note: TokenUsage conflicts with ai/agent-config.interface.ts
export type { TokenUsage as AnalyseTokenUsage } from "./analyse/dashboard.interface";
export * from "./analyse/dashboard.interface";

// Export AI related types
export type {
    AgentReferenceSources,
    AIRawResponse,
    ChatMessage,
    MessageMetadata,
    TokenUsage,
} from "./ai/agent-config.interface";
export type { ChatMessageUsage } from "./ai/chat-message-usage.interface";
export * from "./ai/message-content.interface";
export * from "./ai/retrieval-config.interface";
