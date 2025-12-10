/**
 * @fileoverview Console API service functions for AI agent management
 * @description This file contains API functions for AI agent CRUD operations,
 * agent chat functionality, annotation management, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity, BaseQueryParams, Pagination, PaginationResult } from "../models/globals";
import type { AiMessage } from "../models/message";
import type { TagFormData } from "./tag";

// ==================== Base Type Definitions ====================

/**
 * Message role type
 * @description Standard message roles for AI conversations
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Standard message interface
 * @description Basic message structure used across different contexts
 */
export interface BaseMessage {
    /** Message role */
    role: MessageRole;
    /** Message content */
    content: string;
}

/**
 * Token usage statistics interface
 * @description Standard token usage tracking structure
 */
export interface TokenUsage {
    /** Prompt tokens used */
    prompt_tokens?: number;
    /** Completion tokens used */
    completion_tokens?: number;
    /** Total tokens used */
    total_tokens?: number;
}

/**
 * Content chunk interface
 * @description Standard structure for content chunks in knowledge bases
 */
export interface ContentChunk {
    /** Chunk ID */
    id: string;
    /** Chunk content */
    content: string;
    /** Relevance score */
    score: number;
    /** Chunk metadata */
    metadata?: Record<string, unknown>;
    /** Source file name */
    fileName?: string;
    /** Chunk index in document */
    chunkIndex?: number;
}

/**
 * Reference source interface
 * @description Standard structure for knowledge base references
 */
export interface ReferenceSource {
    /** Knowledge base ID */
    datasetId: string;
    /** Knowledge base name */
    datasetName?: string;
    /** Retrieved content chunks */
    chunks: ContentChunk[];
}

/**
 * User information interface
 * @description Standard user information structure
 */
export interface UserInfo {
    /** Username */
    username: string;
    /** User nickname */
    nickname?: string;
    /** Phone number */
    phone?: string;
    /** User avatar */
    avatar?: string;
    /** Email address */
    email?: string;
}

/**
 * Date count data point interface
 * @description Standard structure for time-series data points
 */
export interface DateCountData {
    /** Date string */
    date: string;
    /** Count value */
    count: number;
}

/**
 * AI model configuration interface
 * @description Configuration settings for AI model parameters and behavior
 */
export interface ModelConfig {
    /** Model identifier */
    id: string;
    /** Model parameter configuration options */
    options?: {
        /** Temperature parameter for response randomness (0-2) */
        temperature?: number;
        /** Maximum number of tokens in response */
        maxTokens?: number;
        /** Top P parameter for nucleus sampling (0-1) */
        topP?: number;
        /** Frequency penalty to reduce repetition (-2 to 2) */
        frequencyPenalty?: number;
        /** Presence penalty to encourage new topics (-2 to 2) */
        presencePenalty?: number;
        /** Stop sequences to end generation */
        stop?: string[];
        /** Response format specification */
        responseFormat?: string;
        /** Additional custom parameters */
        [key: string]: any;
    };
}

// ==================== Agent Configuration Types ====================

/**
 * Agent statistics query parameters interface
 * @description Parameters for querying agent usage statistics
 */
export interface QueryAgentStatisticsParams {
    /** Start date for statistics (ISO 8601 format) */
    startDate?: string;
    /** End date for statistics (ISO 8601 format) */
    endDate?: string;
}

/**
 * Form field configuration interface
 * @description Configuration for dynamic form fields in agent interactions
 */
export interface FormFieldConfig {
    /** Field name identifier */
    name: string;
    /** Field display label */
    label: string;
    /** Field input type */
    type: "text" | "textarea" | "select";
    /** Whether field is required */
    required?: boolean;
    /** Maximum length limit */
    maxLength?: number;
    /** Options list (used when type is select) */
    options?: string[];
}

/**
 * Auto-follow-up questions configuration interface
 * @description Configuration for automatic follow-up question generation
 */
export interface AutoQuestionsConfig {
    /** Whether auto-questions are enabled */
    enabled: boolean;
    /** Whether custom rules are enabled */
    customRuleEnabled: boolean;
    /** Custom rule content */
    customRule?: string;
}

/**
 * Quick command configuration interface
 * @description Configuration for predefined quick commands in agent interface
 */
export interface QuickCommandConfig {
    /** Command avatar/icon */
    avatar: string;
    /** Command name */
    name: string;
    /** Command content */
    content: string;
    /** Reply type: custom or model-generated */
    replyType: "custom" | "model";
    /** Reply content */
    replyContent: string;
}

/**
 * Third-party platform integration configuration interface
 * @description Configuration for integrating with external platforms
 */
export interface ThirdPartyIntegrationConfig {
    /** Application/bot ID */
    appId?: string;
    /** API key for authentication */
    apiKey: string;
    /** API endpoint URL */
    baseURL: string;
    /** Extended configuration for platform-specific settings */
    extendedConfig?: Record<string, any>;
    /** Variable mapping configuration */
    variableMapping?: Record<string, string>;
    /** Whether to use external conversation history management */
    useExternalConversation?: boolean;
}

/**
 * Billing configuration interface
 * @description Configuration for agent billing and pricing
 */
export interface BillingConfig {
    /** Price per usage */
    price: number;
}

/**
 * Agent decorate link item interface
 * @description 跳转对象，复用 LinkItem 语义（控制台侧）
 */
export interface AgentDecorateLinkItem {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
}

/**
 * Agent decorate config interface
 * @description 公共广场页头部运营位数据结构
 */
export interface AgentDecorateConfig {
    enabled: boolean;
    title: string;
    description: string;
    link: AgentDecorateLinkItem;
    heroImageUrl: string;
    overlayTitle: string;
    overlayDescription: string;
    overlayIconUrl: string;
}

/**
 * Publishing configuration interface
 * @description Configuration for agent publishing settings
 */
export interface PublishConfig {
    /** Allowed origins for CORS */
    allowOrigins?: string[];
    /** Rate limit per minute */
    rateLimitPerMinute?: number;
    /** Whether to show branding */
    showBranding?: boolean;
    /** Whether to allow history download */
    allowDownloadHistory?: boolean;
}

/**
 * AI Agent entity interface
 * @description Core interface for AI agent entities with all configuration options
 */
export interface Agent extends BaseEntity {
    /** Agent name */
    name: string;
    /** Agent description */
    description?: string;
    /** Agent avatar image */
    avatar?: string;
    /** Chat interface avatar */
    chatAvatar?: string;
    /** Role prompt/instructions */
    rolePrompt?: string;
    /** Whether to show conversation context */
    showContext: boolean;
    /** Whether to show reference sources */
    showReference: boolean;
    /** Whether to enable user feedback */
    enableFeedback: boolean;
    /** Whether to enable web search */
    enableWebSearch: boolean;
    /** Number of users who accessed this agent */
    userCount: number;
    /** Number of conversations (for public agent list) */
    conversationCount?: number;
    /** Provider information (for public agent list) */
    provider?: {
        /** Provider name */
        name: string;
        /** Provider icon URL */
        iconUrl?: string;
    };
    /** AI model configuration */
    modelConfig?: ModelConfig;
    /** Associated knowledge base IDs */
    datasetIds?: string[];
    /** MCP server IDs */
    mcpServerIds?: string[];
    /** Opening statement for conversations */
    openingStatement?: string;
    /** Opening questions configuration */
    openingQuestions?: string[];
    /** Quick command configurations */
    quickCommands?: QuickCommandConfig[];
    /** Auto-follow-up questions configuration */
    autoQuestions?: AutoQuestionsConfig;
    /** Form field configurations */
    formFields?: FormFieldConfig[];
    /** Form field input values (for preview and testing) */
    formFieldsInputs?: Record<string, any>;
    /** Creator user ID */
    createdBy: string;
    /** Whether agent is published */
    isPublished?: boolean;
    /** Whether agent is public */
    isPublic?: boolean;
    /** Public access token */
    publishToken?: string;
    /** API access key */
    apiKey?: string;
    /** Publishing configuration */
    publishConfig?: PublishConfig;
    /** Third-party platform integration configuration */
    thirdPartyIntegration?: ThirdPartyIntegrationConfig;
    /** Associated tags (only for type='app') */
    tags: TagFormData[];
    /** Additional dynamic properties */
    [index: string]: any;
}

// ==================== Agent Request/Response Types ====================

/**
 * Update agent configuration request parameters interface
 * @description Parameters for updating agent configuration settings
 */
export type UpdateAgentConfigParams = Partial<
    Omit<Agent, keyof BaseEntity | "userCount" | "createdBy">
>;

/**
 * Query agent request parameters interface
 * @description Parameters for querying agent list with pagination
 */
export interface QueryAgentParams extends Pagination {
    /** Keyword search filter */
    keyword?: string;
    /** Public visibility filter */
    isPublic?: boolean;
    /** Tag IDs filter (array or comma-separated string) */
    tagIds: string[];
}

// ==================== Chat Related Types ====================

/**
 * Agent chat record entity interface
 * @description Interface for agent conversation records with metadata
 */
export interface AgentChatRecord extends BaseEntity {
    /** Conversation title */
    title: string;
    /** User ID */
    userId: string;
    /** Agent ID */
    agentId: string;
    /** Conversation summary */
    summary?: string;
    /** Total message count */
    messageCount: number;
    /** Anonymous user identifier */
    anonymousIdentifier?: string;
    /** Total token consumption */
    totalTokens: number;
    /** Consumed computing power */
    consumedPower: number;
    /** Conversation configuration */
    config?: Record<string, any>;
    /** Whether record is deleted */
    isDeleted: boolean;
    /** Reference sources */
    referenceSources?: ReferenceSource[];
    /** Extended metadata */
    metadata?: Record<string, any>;
    /** Associated agent information */
    agent?: Agent;
    /** Associated user information */
    user?: UserInfo;
}

/**
 * Agent chat message entity interface
 * @description Interface for individual chat messages in agent conversations
 */
export interface AgentChatMessage extends BaseEntity {
    /** Conversation record ID */
    conversationId: string;
    /** Agent ID */
    agentId: string;
    /** User ID */
    userId: string;
    /** Message role */
    role: MessageRole;
    /** Message content */
    content: string;
    /** Message type */
    messageType: string;
    /** Token usage statistics */
    tokens?: TokenUsage;
    /** Raw AI response data */
    rawResponse?: any;
    /** Reference sources */
    referenceSources?: any[];
    /** Form variables */
    formVariables?: Record<string, string>;
}

/**
 * Agent chat request parameters interface
 * @description Parameters for agent chat interactions
 */
export interface AgentChatParams {
    /** Message list (standard AI chat format) */
    messages: BaseMessage[];
    /** Conversation record ID (optional, creates new if not provided) */
    conversationId?: string;
    /** Form variables (for variable substitution in role prompts) */
    formVariables?: Record<string, string>;
    /** Whether to save conversation record (default: true) */
    saveConversation?: boolean;
    /** Conversation title (used when creating new conversation) */
    title?: string;
    /** Whether to include context */
    includeContext?: boolean;
    /** Whether to return reference sources */
    includeReferences?: boolean;
    /** Whether to generate auto-suggestions */
    generateSuggestions?: boolean;
    /** AI model configuration */
    modelConfig?: ModelConfig;
    /** Knowledge base IDs */
    datasetIds?: string[];
    /** Role prompt/instructions */
    rolePrompt?: string;
    /** Whether to show conversation context */
    showContext?: boolean;
    /** Whether to show reference sources */
    showReference?: boolean;
    /** Whether to enable user feedback */
    enableFeedback?: boolean;
    /** Whether to enable web search */
    enableWebSearch?: boolean;
    /** Auto-follow-up questions configuration */
    autoQuestions?: AutoQuestionsConfig;
}

/**
 * Agent chat test request parameters interface
 * @description Parameters for testing agent chat functionality
 */
export interface AgentChatTestParams {
    /** User message */
    message: string;
    /** Conversation history */
    history?: Array<{
        /** Message role */
        role: "user" | "assistant";
        /** Message content */
        content: string;
    }>;
    /** Temporary agent configuration (for testing, not saved to database) */
    agentConfig?: Partial<UpdateAgentConfigParams>;
}

/**
 * Agent chat response result interface
 * @description Response structure for agent chat interactions
 */
export interface AgentChatResponse {
    /** Conversation record ID */
    conversationId: string;
    /** AI response content */
    response: string;
    /** Reference sources (if enabled) */
    referenceSources?: ReferenceSource[];
    /** Conversation context (if enabled) */
    context?: Array<{
        /** Message role */
        role: "user" | "assistant";
        /** Message content */
        content: string;
        /** Message timestamp */
        timestamp: Date;
    }>;
    /** Auto-suggestion questions (if enabled) */
    suggestions?: string[];
    /** Token usage statistics */
    tokenUsage?: {
        /** Total tokens used */
        totalTokens: number;
        /** Prompt tokens used */
        promptTokens: number;
        /** Completion tokens used */
        completionTokens: number;
    };
    /** Response time in milliseconds */
    responseTime: number;
}

// ==================== Chat Record Types ====================

/**
 * Query agent chat record request parameters interface
 * @description Parameters for querying agent chat records with pagination
 */
export interface QueryAgentChatRecordParams extends Pagination {
    /** Agent ID */
    agentId: string;
    /** Keyword search filter */
    keyword?: string;
}

/**
 * Batch delete chat record request parameters interface
 * @description Parameters for batch deletion of chat records
 */
export interface BatchDeleteChatRecordParams {
    /** Array of chat record IDs */
    ids: string[];
}

/**
 * Create chat record request parameters interface
 * @description Parameters for creating new chat records
 */
export interface CreateChatRecordParams {
    /** Agent ID */
    agentId: string;
    /** Conversation title */
    title?: string;
}

// ==================== Annotation Types ====================

/**
 * Agent annotation review status type
 * @description Status values for annotation review process
 */
export type AnnotationReviewStatus = "pending" | "approved" | "rejected";

/**
 * Agent annotation entity interface
 * @description Interface for agent annotation entities with review information
 */
export interface AgentAnnotation extends BaseEntity {
    /** Annotation ID */
    id: string;
    /** Associated agent ID */
    agentId: string;
    /** Question content */
    question: string;
    /** Answer content */
    answer: string;
    /** Hit count (number of times this annotation was used) */
    hitCount: number;
    /** Whether annotation is enabled */
    enabled: boolean;
    /** Review status */
    reviewStatus: AnnotationReviewStatus;
    /** Reviewer user ID */
    reviewedBy?: string;
    /** Review timestamp */
    reviewedAt?: string;
    /** Creator user ID */
    createdBy: string;
    /** Reviewer information */
    reviewer?: UserInfo;
}

/**
 * Create agent annotation request parameters interface
 * @description Parameters for creating new agent annotations
 */
export interface CreateAgentAnnotationParams {
    /** Agent ID */
    agentId?: string;
    /** Question content */
    question: string;
    /** Answer content */
    answer: string;
    /** Whether annotation is enabled */
    enabled?: boolean;
    /** Associated chat message ID */
    messageId?: string;
}

/**
 * Update agent annotation request parameters interface
 * @description Parameters for updating existing agent annotations
 */
export type UpdateAgentAnnotationParams = Partial<
    Pick<CreateAgentAnnotationParams, "question" | "answer" | "enabled" | "messageId">
>;

/**
 * Query agent annotation parameters interface
 * @description Parameters for querying agent annotations with filters
 */
export interface QueryAgentAnnotationParams extends BaseQueryParams {
    /** Agent ID filter */
    agentId?: string;
    /** Question content keyword filter */
    keyword?: string;
    /** Enabled status filter */
    enabled?: boolean;
    /** Review status filter */
    reviewStatus?: AnnotationReviewStatus;
}

/**
 * Review annotation request parameters interface
 * @description Parameters for reviewing agent annotations
 */
export interface ReviewAnnotationParams {
    /** Review status to set */
    reviewStatus: AnnotationReviewStatus;
}

/**
 * Annotation match test result interface
 * @description Result structure for annotation matching tests
 */
export interface AnnotationMatchResult {
    /** Whether a match was found */
    matched: boolean;
    /** Matched annotation information */
    annotation?: Pick<AgentAnnotation, "id" | "question" | "answer" | "hitCount"> | null;
    /** Similarity score */
    similarity?: number;
}

// ==================== Statistics Types ====================

/**
 * Agent statistics data interface
 * @description Comprehensive statistics data for agent usage and performance
 */
export interface AgentStatistics {
    /** Overview statistics data */
    overview: {
        /** Total number of conversations */
        totalConversations: number;
        /** Total number of messages */
        totalMessages: number;
        /** Total token consumption */
        totalTokens: number;
        /** Total computing power consumed */
        totalConsumedPower: number;
        /** Total number of annotations */
        totalAnnotations: number;
        /** Number of active annotations */
        activeAnnotations: number;
        /** Total annotation hit count */
        annotationHitCount: number;
    };
    /** Trend data over time */
    trends: {
        /** Computing power consumption trend */
        consumedPower: DateCountData[];
        /** Message count trend */
        messages: DateCountData[];
        /** Token consumption trend */
        tokens: DateCountData[];
        /** Active users trend */
        activeUsers: DateCountData[];
    };
}

// ==================== Template Types ====================

/**
 * Agent template configuration interface
 * @description Interface for agent template configurations with metadata
 */
export interface AgentTemplateConfig extends UpdateAgentConfigParams {
    /** Template ID */
    id: string;
    /** Template name */
    name: string;
    /** Template description */
    description?: string;
    /** Template category */
    categories: string;
    /** Template tags */
    tags: string[];
    /** Whether template is recommended */
    isRecommended: boolean;
}

/**
 * Create agent from template parameters interface
 * @description Parameters for creating agents from templates
 */
export interface CreateAgentFromTemplateParams {
    /** Template ID */
    templateId: string;
    /** Agent name */
    name: string;
    /** Agent description */
    description?: string;
    /** Agent avatar */
    avatar?: string;
    /** Custom configuration overrides */
    customConfig?: Partial<AgentTemplateConfig>;
}

/**
 * Query template list parameters interface
 * @description Parameters for querying agent templates with filters and sorting
 */
export interface QueryTemplateParams {
    /** Search keyword */
    keyword?: string;
    /** Category filter */
    category?: string;
    /** Tags filter */
    tags?: string[];
    /** Whether to show only recommended templates */
    recommended?: boolean;
    /** Sort field */
    sortBy?: "name" | "usageCount" | "rating" | "createdAt";
    /** Sort order */
    sortOrder?: "asc" | "desc";
}

// ==================== Agent Management Related APIs ====================

/**
 * Create agent
 * @description Create a new AI agent with specified configuration
 * @param data Agent creation data
 * @returns Promise with created agent information
 */
export function apiCreateAgent(data: UpdateAgentConfigParams): Promise<Agent> {
    return useConsolePost("/ai-agent", data);
}

/**
 * Get agent list
 * @description Get paginated list of agents based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated agent list result
 */
export function apiGetAgentList(params: QueryAgentParams): Promise<PaginationResult<Agent>> {
    return useConsoleGet("/ai-agent", params, { requireAuth: true });
}

/**
 * Get agent detail
 * @description Get detailed agent information by agent ID
 * @param id Agent ID
 * @returns Promise with agent detail information
 */
export function apiGetAgentDetail(id: string): Promise<Agent> {
    return useConsoleGet(`/ai-agent/${id}`);
}

/**
 * Update agent configuration
 * @description Update agent configuration settings by agent ID
 * @param id Agent ID
 * @param data Update data
 * @returns Promise with updated agent information
 */
export function apiUpdateAgentConfig(id: string, data: UpdateAgentConfigParams): Promise<Agent> {
    return useConsolePatch(`/ai-agent/${id}`, data);
}

/**
 * Delete agent
 * @description Delete specified agent by agent ID
 * @param id Agent ID
 * @returns Promise with deletion result
 */
export function apiDeleteAgent(id: string): Promise<{ message: string }> {
    return useConsoleDelete(`/ai-agent/${id}`);
}

// ==================== Agent Tag Management Related APIs ====================

/**
 * Batch add tags to agent
 * @description Add multiple tags to an agent
 * @param id Agent ID
 * @param tagIds Array of tag IDs to add
 * @returns Promise with updated agent information
 */
export function apiAddAgentTags(id: string, tagIds: string[]): Promise<Agent> {
    return useConsolePost(`/ai-agent/${id}/tags`, { tagIds });
}

/**
 * Batch remove tags from agent
 * @description Remove multiple tags from an agent
 * @param id Agent ID
 * @param tagIds Array of tag IDs to remove
 * @returns Promise with updated agent information
 */
export function apiRemoveAgentTags(id: string, tagIds: string[]): Promise<Agent> {
    return useConsoleDelete(`/ai-agent/${id}/tags`, { tagIds });
}

// ==================== Agent Chat Related APIs ====================

/**
 * Agent streaming chat
 * @description Initiate streaming chat with AI agent
 * @param messages Message list for conversation
 * @param config Chat configuration (includes agentId)
 * @returns Promise with stream controller for aborting
 */
export function apiAgentChat(
    messages: AiMessage[] | any,
    config?: Partial<Record<string, any>>,
): Promise<{ abort: () => void }> {
    const agentId = config?.agentId || config?.body?.agentId;
    if (!agentId) {
        throw new Error("Agent ID is required");
    }
    delete config.body?.agentId;
    return useConsoleStream(`/ai-agent/${agentId}/chat/stream`, { ...config, messages });
}

// ==================== Agent Chat Record Related APIs ====================

/**
 * Get agent chat record list
 * @description Get paginated list of agent chat records based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated chat record list result
 */
export function apiGetAgentChatRecordList(
    params: QueryAgentChatRecordParams,
): Promise<PaginationResult<AgentChatRecord[]>> {
    return useConsoleGet("/ai-agent-chat-record", params, { requireAuth: true });
}

/**
 * Get chat record detail
 * @description Get detailed chat record information by record ID
 * @param id Chat record ID
 * @returns Promise with chat record detail information
 */
export function apiGetAgentChatRecordDetail(id: string): Promise<AgentChatRecord> {
    return useConsoleGet(`/ai-agent-chat-record/${id}`);
}

/**
 * Get agent chat messages
 * @description Get paginated list of messages for a specific conversation
 * @param conversationId Conversation record ID
 * @param params Pagination parameters
 * @returns Promise with paginated message list result
 */
export function apiGetAgentChatsMessages(
    conversationId: string,
    params: { page?: number; pageSize?: number },
): Promise<PaginationResult<AgentChatMessage[]>> {
    return useConsoleGet(`/ai-agent-chat-message/conversation/${conversationId}`, params, {
        requireAuth: true,
    });
}

/**
 * Create chat record
 * @description Create a new chat record for agent conversation
 * @param data Creation parameters
 * @returns Promise with created chat record information
 */
export function apiCreateAgentChatRecord(data: CreateChatRecordParams): Promise<AgentChatRecord> {
    return useConsolePost("/ai-agent-chat-record", data);
}

/**
 * Batch delete chat records
 * @description Delete multiple chat records by record ID array
 * @param data Batch deletion parameters
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteAgentChatRecords(
    data: BatchDeleteChatRecordParams,
): Promise<{ message: string }> {
    return useConsoleDelete("/ai-agent-chat-record/batch", data);
}

/**
 * Delete single chat record
 * @description Delete specified chat record by record ID
 * @param id Chat record ID
 * @returns Promise with deletion result
 */
export function apiDeleteAgentChatRecord(id: string): Promise<{ message: string }> {
    return useConsoleDelete(`/ai-agent-chat-record/${id}`);
}

// ==================== Agent Annotation Related APIs ====================

/**
 * Create agent annotation
 * @description Create a new annotation for agent with question-answer pair
 * @param agentId Agent ID
 * @param data Annotation creation data
 * @returns Promise with created annotation information
 */
export function apiCreateAgentAnnotation(
    agentId: string,
    data: CreateAgentAnnotationParams,
): Promise<AgentAnnotation> {
    return useConsolePost(`/ai-agent-annotations`, { ...data, agentId });
}

/**
 * Get agent annotation list
 * @description Get paginated list of agent annotations based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated annotation list result
 */
export function apiGetAgentAnnotationList(
    params?: QueryAgentAnnotationParams,
): Promise<PaginationResult<AgentAnnotation>> {
    return useConsoleGet(`/ai-agent-annotations`, params);
}

/**
 * Get annotation detail
 * @description Get detailed annotation information by annotation ID
 * @param annotationId Annotation ID
 * @returns Promise with annotation detail information
 */
export function apiGetAgentAnnotationDetail(annotationId: string): Promise<AgentAnnotation> {
    return useConsoleGet(`/ai-agent-annotations/${annotationId}`);
}

/**
 * Update agent annotation
 * @description Update annotation information by annotation ID
 * @param annotationId Annotation ID
 * @param data Update data
 * @returns Promise with updated annotation information
 */
export function apiUpdateAgentAnnotation(
    annotationId: string,
    data: UpdateAgentAnnotationParams,
): Promise<AgentAnnotation> {
    return useConsolePut(`/ai-agent-annotations/${annotationId}`, data);
}

/**
 * Review agent annotation
 * @description Review annotation by setting review status
 * @param annotationId Annotation ID
 * @param data Review data
 * @returns Promise with reviewed annotation information
 */
export function apiReviewAgentAnnotation(
    annotationId: string,
    data: ReviewAnnotationParams,
): Promise<AgentAnnotation> {
    return useConsolePut(`/ai-agent-annotations/${annotationId}/review`, data);
}

/**
 * Delete agent annotation
 * @description Delete specified annotation by annotation ID
 * @param annotationId Annotation ID
 * @returns Promise with deletion result
 */
export function apiDeleteAgentAnnotation(annotationId: string): Promise<{ message: string }> {
    return useConsoleDelete(`/ai-agent-annotations/${annotationId}`);
}

/**
 * Get agent statistics
 * @description Get comprehensive statistics for agent usage and performance
 * @param agentId Agent ID
 * @param params Statistics query parameters
 * @returns Promise with agent statistics data
 */
export function apiGetAgentStatistics(
    agentId: string,
    params?: QueryAgentStatisticsParams,
): Promise<AgentStatistics> {
    return useConsoleGet(`/ai-agent/${agentId}/statistics`, params);
}

// ==================== Agent Template Related APIs ====================

/**
 * Get agent template list
 * @description Get list of available agent templates with optional filtering
 * @param params Template query parameters
 * @returns Promise with agent template list
 */
export function apiGetAgentTemplates(params?: QueryTemplateParams): Promise<AgentTemplateConfig[]> {
    return useConsoleGet("/ai-agent-template/templates", params);
}

/**
 * Get template category list
 * @description Get list of available template categories
 * @returns Promise with template category list
 */
export function apiGetAgentTemplateCategories(): Promise<string[]> {
    return useConsoleGet("/ai-agent-template/templates/categories");
}

/**
 * Get recommended templates
 * @description Get list of recommended agent templates
 * @returns Promise with recommended template list
 */
export function apiGetRecommendedTemplates(): Promise<AgentTemplateConfig[]> {
    return useConsoleGet("/ai-agent-template/templates/recommended");
}

/**
 * Create agent from template
 * @description Create a new agent based on template configuration
 * @param data Template creation parameters
 * @returns Promise with created agent information
 */
export function apiCreateAgentFromTemplate(data: CreateAgentFromTemplateParams): Promise<Agent> {
    return useConsolePost("/ai-agent-template/templates/create", data);
}

// ==================== Agent Import/Export Related APIs ====================

/**
 * Export agent DSL configuration
 * @description Export agent configuration as DSL (YAML or JSON) file
 * @param id Agent ID
 * @param format Export format (yaml or json)
 * @returns Promise with DSL configuration string
 */
export function apiExportAgentDsl(id: string, format: "yaml" | "json" = "yaml"): Promise<string> {
    return useConsoleGet(`/ai-agent-template/export-dsl`, { id, format });
}

/**
 * Import agent DSL configuration
 * @description Import agent configuration from DSL (YAML or JSON) file
 * @param data Import DSL data
 * @returns Promise with imported agent information
 */
export function apiImportAgentDsl(data: {
    content: string;
    format?: "yaml" | "json";
    name?: string;
    description?: string;
    avatar?: string;
}): Promise<Agent> {
    return useConsolePost("/ai-agent-template/import-dsl", data);
}

// ==================== Agent Decorate Config APIs ====================

/**
 * Get agent decorate config (console)
 * @description 后台获取运营位配置
 */
export function apiConsoleGetAgentDecorate(): Promise<AgentDecorateConfig> {
    return useConsoleGet("/agent-decorate");
}

/**
 * Set agent decorate config (console)
 * @description 后台设置运营位配置
 */
export function apiConsoleSetAgentDecorate(
    data: AgentDecorateConfig,
): Promise<AgentDecorateConfig> {
    return useConsolePost("/agent-decorate", data);
}

/**
 * Get agent decorate config (web)
 * @description 前台公开获取运营位配置
 */
export function apiGetAgentDecorate(): Promise<AgentDecorateConfig> {
    return useWebGet("/agent-decorate");
}
