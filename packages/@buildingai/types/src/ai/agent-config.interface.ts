/**
 * 自动追问配置类型
 */
export interface AutoQuestionsConfig {
    enabled: boolean;
    customRuleEnabled: boolean;
    customRule?: string;
}

/**
 * 快捷指令配置类型
 */
export interface QuickCommandConfig {
    avatar: string;
    name: string;
    content: string;
    replyType: "custom" | "model";
    replyContent: string;
}

/**
 * 模型配置类型
 */
export interface ModelConfig {
    /** 模型ID */
    id?: string;
    /** 模型参数配置 */
    options?: {
        /** 温度参数 */
        temperature?: number;
        /** 最大Token数 */
        maxTokens?: number;
        /** Top P参数 */
        topP?: number;
        /** 频率惩罚 */
        frequencyPenalty?: number;
        /** 存在惩罚 */
        presencePenalty?: number;
        /** 停止词 */
        stop?: string[];
        /** 其他自定义参数 */
        [key: string]: any;
    };
}

/**
 * 表单字段配置类型
 */
export interface FormFieldConfig {
    /** 字段名 */
    name: string;
    /** 字段标签 */
    label: string;
    /** 字段类型 */
    type: "text" | "textarea" | "select";
    /** 是否必填 */
    required?: boolean;
    /** 最大长度限制 */
    maxLength?: number;
    /** 选项列表（仅当type为select时使用） */
    options?:
        | string[]
        | Array<{
              label: string;
              value: string;
          }>;
}

/**
 * Token使用统计类型
 */
export interface TokenUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    // 兼容其他格式
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

import type { Attachment, MessageContent } from "./message-content.interface";
import type { RetrievalChunk } from "./retrieval-config.interface";

/**
 * 聊天消息类型
 */
export interface ChatMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: MessageContent;
    tool_call_id?: string;
    attachments?: Attachment[];
}

/**
 * 智能体对话引用来源
 */
export interface AgentReferenceSources {
    datasetId: string;
    datasetName?: string;
    userContent: string;
    retrievalMode?: string;
    duration?: number;
    chunks: RetrievalChunk[];
}

/**
 * AI响应原始数据类型
 */
export interface AIRawResponse {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    usage?: TokenUsage;
    choices?: Array<{
        index?: number;
        message?: {
            role?: string;
            content?: string;
        };
        finish_reason?: string;
        delta?: {
            content?: string;
        };
    }>;
    // 添加索引签名以兼容各种AI服务的响应格式
    [key: string]: unknown;
}

/**
 * 消息元数据类型
 */
export interface MessageMetadata {
    /** 引用来源 */
    references?: AgentReferenceSources[];
    /** 对话上下文 */
    context?: ChatMessage[];
    /** 问题建议 */
    suggestions?: string[];
    /** 深度思考数据 */
    reasoning?: {
        content: string;
        startTime: number;
        endTime: number;
        duration: number;
    };
    /** 其他扩展数据 */
    [key: string]: unknown;
}

/**
 * 记忆配置类型
 */
export interface MemoryConfig {
    /** 最大用户全局记忆条数（默认 20） */
    maxUserMemories?: number;
    /** 最大 Agent 专属记忆条数（默认 20） */
    maxAgentMemories?: number;
}

/**
 * 模型引用：指向一个具体模型 + 可选的参数覆盖
 */
export interface ModelReference {
    /** 模型 ID（ai_model 表主键） */
    modelId: string;
    /** 参数覆盖（会合并到该模型的默认参数之上） */
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        [key: string]: any;
    };
}

/**
 * 多模型路由配置
 * 为不同功能模块指定独立模型，未配置时回退到主 modelConfig
 */
export interface ModelRouting {
    /** 记忆提取模型（可用便宜/快速模型降低成本） */
    memoryModel?: ModelReference;
    /** 目标评估 / 规划模型 */
    planningModel?: ModelReference;
    /** 反思模型 */
    reflectionModel?: ModelReference;
    /** 追问建议模型 */
    titleModel?: ModelReference;
    /** 语音转文字模型（modelType = speech2text） */
    sttModel?: ModelReference;
    /** 文字转语音模型（modelType = tts） */
    ttsModel?: ModelReference;
}

/**
 * 上下文窗口管理配置
 */
export interface ContextConfig {
    /** 最大上下文消息条数（覆盖模型默认 maxContext） */
    maxContextMessages?: number;
    /** 最大上下文 token 数 */
    maxContextTokens?: number;
    /** 截断策略 */
    truncationStrategy?: "sliding_window" | "summary";
}

/**
 * 语音配置
 */
export interface VoiceConfig {
    /** 语音转文字配置 */
    stt?: {
        modelId: string;
        language?: string;
    };
    /** 文字转语音配置 */
    tts?: {
        modelId: string;
        voiceId?: string;
        speed?: number;
    };
}

/**
 * 工具配置
 */
export interface ToolConfig {
    /** 是否开启工具执行前人工审批（开启则所有工具需审批，不开启则自动执行） */
    requireApproval?: boolean;
    /** 单个工具执行超时（毫秒，默认 30000） */
    toolTimeout?: number;
}

/**
 * 问答标注配置
 */
export interface AnnotationConfig {
    /** 是否开启问答标注 */
    enabled?: boolean;
    /** 相似度阈值 0.85-1，默认 0.9 */
    threshold?: number;
    /** 向量模型 ID，用于语义匹配 */
    vectorModelId?: string;
}

/**
 * 第三方平台集成配置类型
 * 通用的配置接口，支持各种第三方平台的集成
 */
export interface ThirdPartyIntegrationConfig {
    /** 第三方平台标识 */
    provider?: "coze" | "dify";
    /** 应用/机器人ID */
    appId?: string;
    /** API 密钥 */
    apiKey?: string;
    /** API 端点地址 */
    baseURL?: string;
    /** 扩展配置，支持各平台特有配置 */
    extendedConfig?: Record<string, any>;
    /** 变量映射配置 */
    variableMapping?: Record<string, string>;
    /** 是否使用平台的对话历史管理 */
    useExternalConversation?: boolean;
}

export interface AgentWxcomConfig {
    /** 是否启用 */
    enabled?: boolean;
    /** 企业ID */
    corpId?: string;
    /** AgentID */
    agentId?: string;
    /** 应用Secret */
    secret?: string;
    /** Token */
    token?: string;
    /** EncodingAESKey */
    encodingAesKey?: string;
    /** 自定义回调路径（可选） */
    callbackPath?: string;
}

export interface AgentPublishConfig {
    enableSite?: boolean;
    accessToken?: string | null;
    enableApiKey?: boolean;
    apiKey?: string | null;
    wxcomConfig?: AgentWxcomConfig;
}

export interface DashboardChartItem {
    date: string;
    value: number;
}

export interface DailyFeedbackItem {
    date: string;
    like: number;
    dislike: number;
}

export interface AgentDashboardResult {
    cards: {
        totalRecords: number;
        totalMessages: number;
        totalTokens: number;
        totalPower: number;
        totalAnnotations: number;
        hitAnnotations: number;
    };
    charts: {
        dailyTokens: DashboardChartItem[];
        dailyMessages: DashboardChartItem[];
        dailyUsers: DashboardChartItem[];
        dailyPower: DashboardChartItem[];
        dailyRecords: DashboardChartItem[];
        dailyFeedback: DailyFeedbackItem[];
        dailyAnnotations: DashboardChartItem[];
    };
}

export interface TranscribeResult {
    text: string;
    language?: string;
    duration?: number;
}

export interface SpeechOptions {
    modelId?: string;
    voice?: string;
    speed?: number;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

export interface AgentCore {
    id: string;
    name: string;
    description?: string | null;
    createMode?: "direct" | "coze" | "dify" | null;
    avatar?: string | null;
    chatAvatar?: string | null;
    thirdPartyIntegration?: ThirdPartyIntegrationConfig | null;
    rolePrompt?: string | null;
    showContext?: boolean;
    showReference?: boolean;
    enableWebSearch?: boolean;
    enableFileUpload?: boolean;
    chatAvatarEnabled?: boolean;
    modelConfig?: ModelConfig | null;
    datasetIds?: string[] | null;
    openingStatement?: string | null;
    openingQuestions?: string[] | null;
    quickCommands?: QuickCommandConfig[] | null;
    autoQuestions?: AutoQuestionsConfig | null;
    formFields?: FormFieldConfig[] | null;
    formFieldsInputs?: Record<string, unknown> | null;
    mcpServerIds?: string[] | null;
    modelRouting?: ModelRouting | null;
    contextConfig?: ContextConfig | null;
    voiceConfig?: VoiceConfig | null;
    toolConfig?: ToolConfig | null;
    annotationConfig?: AnnotationConfig | null;
    maxSteps?: number | null;
    memoryConfig?: MemoryConfig | null;
    publishConfig?: AgentPublishConfig | null;
    publishedAt?: string | null;
    squarePublishStatus?: "none" | "pending" | "approved" | "rejected";
    squareRejectReason?: string | null;
    createdAt: string;
    updatedAt: string;
    userCount?: number;
    isPublic?: boolean;
    publishedToSquare?: boolean;
    createBy?: string | null;
    creator?: { id: string; nickname: string | null; avatar: string | null } | null;
    tags?: Array<{ id: string; name: string }>;
}

export type Agent = AgentCore & Record<string, unknown>;

export interface ListSquareAgentsParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
    tagIds?: string[];
}

export interface ListAgentsResult {
    items: Agent[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CreateAgentParams {
    name: string;
    description?: string;
    avatar?: string;
    createMode?: "direct" | "coze" | "dify";
    modelConfig?: ModelConfig;
    thirdPartyIntegration?: ThirdPartyIntegrationConfig;
    tagIds?: string[];
}

export type UpdateAgentConfigParams = Partial<
    Pick<
        AgentCore,
        | "name"
        | "description"
        | "avatar"
        | "chatAvatar"
        | "chatAvatarEnabled"
        | "rolePrompt"
        | "showContext"
        | "showReference"
        | "enableWebSearch"
        | "enableFileUpload"
        | "modelConfig"
        | "modelRouting"
        | "contextConfig"
        | "voiceConfig"
        | "toolConfig"
        | "annotationConfig"
        | "maxSteps"
        | "memoryConfig"
        | "datasetIds"
        | "openingStatement"
        | "openingQuestions"
        | "quickCommands"
        | "autoQuestions"
        | "formFields"
        | "formFieldsInputs"
        | "mcpServerIds"
        | "thirdPartyIntegration"
    >
> & {
    tagIds?: string[];
    createMode?: "direct" | "coze" | "dify";
};

export interface PublishedAgentDetail extends Omit<
    AgentCore,
    "createBy" | "squareReviewedBy" | "squareReviewedAt" | "thirdPartyIntegration" | "creator"
> {
    conversationCount: number;
    messageCount: number;
    creator?: { nickname: string; avatar: string | null };
    estimatedUsage?: {
        tokensPerRound: number;
        powerPerRound: number;
    };
    chatBillingRule?: {
        power: number;
        tokens: number;
    };
    models?: Array<{
        role: "chat" | "memory" | "planning" | "followup" | "stt" | "tts";
        id: string;
        name: string;
        model: string;
        providerName: string | null;
        description: string | null;
        features?: string[];
        billingRule?: { power: number; tokens: number };
        supportsThinking?: boolean;
    }>;
    datasets?: Array<{
        id: string;
        name: string;
        description: string | null;
        publishedToSquare: boolean;
        squarePublishStatus: "none" | "pending" | "approved" | "rejected";
        /** Upload capability exposed for third-party agents (Coze/Dify). */
        uploadCapability?: {
            supportedUploadTypes: Array<"image" | "video" | "audio" | "file">;
        };
    }>;
}
