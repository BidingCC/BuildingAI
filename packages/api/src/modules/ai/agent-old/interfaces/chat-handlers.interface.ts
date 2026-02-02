import { type UserPlayground } from "@buildingai/db";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import {
    AgentReferenceSources,
    AIRawResponse,
    ChatMessage,
    MessageMetadata,
    TokenUsage,
} from "@buildingai/types/ai/agent-config.interface";
import type { Attachment, MessageContent } from "@buildingai/types/ai/message-content.interface";
import { RetrievalChunk } from "@buildingai/types/ai/retrieval-config.interface";
import type { Response } from "express";

import { AgentChatDto, AgentChatResponse } from "../dto/agent";

// 类型别名
export type ModelInfo = {
    id: string;
    model: string;
    maxContext?: number;
    modelConfig?: Record<string, any>;
    provider: {
        provider: string;
        bindSecretId: string;
    };
};

export type AIClient = {
    chat: {
        create: (params: any) => Promise<any>;
        stream: (params: any) => Promise<any>;
    };
};

// 快捷命令处理结果
export interface QuickCommandResult {
    matched: boolean;
    response?: string;
    content?: string;
}

// 注解匹配结果
export interface AnnotationMatchResult {
    matched: boolean;
    annotation?: {
        id: string;
        question: string;
        answer: string;
        similarity?: number;
        user?: { nickname?: string; username?: string };
    };
}

// 知识库检索结果
export interface DatasetRetrievalResult {
    datasetId: string;
    datasetName: string;
    retrievalConfig: {
        retrievalMode?: string;
        topK?: number;
        scoreThreshold?: number;
        scoreThresholdEnabled?: boolean;
    };
    chunks: (RetrievalChunk & { datasetId: string; datasetName: string })[];
    duration?: number;
}

// 聊天上下文结果
export interface ChatContextResult {
    systemPrompt: string;
    retrievalResults: DatasetRetrievalResult[];
    messages: ChatMessage[];
    model: ModelInfo;
}

// 计费结果
export interface BillingResult {
    billToUser: User | null;
    billingContext: string;
}

// 响应处理选项
export interface ResponseHandlerOptions {
    responseMode: "blocking" | "streaming";
    shouldIncludeReferences?: boolean;
    shouldIncludeContext?: boolean;
    shouldIncludeSuggestions?: boolean;
    res?: Response;
    billingResult?: { billToUser: any; billingContext: string };
    billingStrategy?: any;
    billingHandler?: any;
}

// ========== 处理器接口定义 ==========

/**
 * 消息处理器接口
 */
export interface IMessageHandler {
    /**
     * 保存用户消息
     */
    saveUserMessage(
        conversationId: string,
        agentId: string,
        userId: string,
        content: MessageContent,
        formVariables?: Record<string, string>,
        formFieldsInputs?: Record<string, any>,
        anonymousIdentifier?: string,
        attachments?: Attachment[],
    ): Promise<void>;

    /**
     * 保存AI助手消息
     */
    saveAssistantMessage(
        conversationId: string,
        agentId: string,
        userId: string,
        content: string,
        tokenUsage?: TokenUsage,
        rawResponse?: AIRawResponse,
        metadata?: MessageMetadata,
        anonymousIdentifier?: string,
    ): Promise<void>;
}

/**
 * 快捷命令处理器接口
 */
export interface IQuickCommandHandler {
    /**
     * 处理快捷命令
     */
    handleQuickCommand(dto: AgentChatDto, lastUserMessage?: ChatMessage): QuickCommandResult;

    /**
     * 生成快捷命令响应
     */
    generateQuickCommandResponse(
        response: string,
        conversationRecord: AgentChatRecord | null,
        agentId: string,
        user: UserPlayground,
        dto: AgentChatDto,
        finalConfig: Agent,
        startTime: number,
        options: ResponseHandlerOptions,
    ): Promise<AgentChatResponse | void>;
}

/**
 * 注解处理器接口
 */
export interface IAnnotationHandler {
    /**
     * 匹配用户问题的注解
     */
    matchUserQuestion(agentId: string, userQuestion: string): Promise<AnnotationMatchResult>;

    /**
     * 生成注解响应
     */
    generateAnnotationResponse(
        annotation: {
            id: string;
            question: string;
            answer: string;
            similarity?: number;
            user?: { nickname?: string; username?: string };
        },
        conversationRecord: AgentChatRecord | null,
        agentId: string,
        user: UserPlayground,
        dto: AgentChatDto,
        finalConfig: Agent,
        startTime: number,
        options: ResponseHandlerOptions,
    ): Promise<AgentChatResponse | void>;
}

/**
 * 知识库检索处理器接口
 */
export interface IKnowledgeRetrievalHandler {
    /**
     * 判断是否需要执行检索
     */
    shouldPerformRetrieval(
        userQuery: string,
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<boolean>;

    /**
     * 执行知识库检索
     */
    performKnowledgeRetrieval(
        datasetIds: string[],
        query: string,
    ): Promise<DatasetRetrievalResult[]>;

    /**
     * 格式化引用源
     */
    formatReferenceSources(
        retrievalResults: DatasetRetrievalResult[],
        content: string,
    ): AgentReferenceSources[];
}

/**
 * 第三方集成处理器接口
 */
export interface IThirdPartyIntegrationHandler {
    /**
     * 检查是否启用第三方集成
     */
    isThirdPartyIntegrationEnabled(agent: Agent, dto: AgentChatDto): boolean;

    /**
     * 验证第三方配置
     */
    validateThirdPartyConfig(agent: Agent, dto: AgentChatDto): void;

    /**
     * 处理第三方集成聊天
     * @param agent 智能体配置
     * @param dto 聊天请求DTO
     * @param user 用户信息
     * @param options 响应处理选项
     * @param conversationRecord 对话记录
     */
    handleThirdPartyIntegrationChat(
        agent: Agent,
        dto: AgentChatDto,
        user: UserPlayground,
        options: ResponseHandlerOptions,
        conversationRecord?: AgentChatRecord | null,
    ): Promise<AgentChatResponse | void>;
}

/**
 * 聊天上下文构建器接口
 */
export interface IChatContextBuilder {
    /**
     * 准备聊天上下文
     */
    prepareChatContext(
        config: Agent,
        dto: AgentChatDto,
        lastUserMessage?: ChatMessage,
    ): Promise<ChatContextResult>;

    /**
     * 构建系统提示词
     */
    buildSystemPrompt(
        config: Agent,
        formVariables?: Record<string, string>,
        formFieldsInputs?: Record<string, unknown>,
    ): string;

    /**
     * 构建聊天消息
     */
    buildChatsMessages(
        systemPrompt: string,
        messages: ChatMessage[],
        retrievalResults: DatasetRetrievalResult[],
    ): ChatMessage[];

    /**
     * 获取AI客户端
     */
    getAIClient(
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<{
        client: AIClient;
        requestOpts: Record<string, any>;
        modelName: string;
    }>;

    /**
     * 准备消息元数据
     */
    prepareMessageMetadata(
        retrievalResults: DatasetRetrievalResult[],
        messages: ChatMessage[],
        response: string,
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
        lastUserMessage?: ChatMessage,
    ): Promise<MessageMetadata>;

    /**
     * 生成自动追问问题
     */
    generateAutoQuestions(
        messages: ChatMessage[],
        response: string,
        model: ModelInfo,
        config: Agent,
        dto: AgentChatDto,
    ): Promise<string[]>;
}

/**
 * 计费处理器接口
 */
export interface IBillingHandler {
    /**
     * 扣除智能体聊天积分
     */
    deductAgentChatPower(
        agentInfo: Partial<Agent>,
        billToUser: User | null,
        user: UserPlayground,
        conversationRecord?: AgentChatRecord | null,
    ): Promise<void>;
}

/**
 * 响应处理器接口
 */
export interface IResponseHandler {
    /**
     * 处理流式响应
     */
    handleStreamingResponse(
        client: AIClient,
        modelName: string,
        messages: ChatMessage[],
        requestOpts: Record<string, any>,
        res: Response,
        context: {
            conversationId?: string;
            agentId: string;
            user: UserPlayground;
            agent: Agent;
            dto: AgentChatDto;
            finalConfig: Agent;
            retrievalResults: DatasetRetrievalResult[];
            model: ModelInfo;
            conversationRecord?: AgentChatRecord | null;
            startTime: number;
            shouldIncludeReferences: boolean;
            lastUserMessage?: ChatMessage;
            billingResult?: { billToUser: any; billingContext: string };
        },
    ): Promise<void>;

    /**
     * 处理阻塞响应
     */
    handleBlockingResponse(
        client: AIClient,
        modelName: string,
        messages: ChatMessage[],
        requestOpts: Record<string, any>,
        context: {
            conversationId?: string;
            agentId: string;
            user: UserPlayground;
            agent: Agent;
            dto: AgentChatDto;
            finalConfig: Agent;
            retrievalResults: DatasetRetrievalResult[];
            model: ModelInfo;
            conversationRecord?: AgentChatRecord | null;
            startTime: number;
            shouldIncludeReferences: boolean;
            lastUserMessage?: ChatMessage;
        },
    ): Promise<AgentChatResponse>;
}
