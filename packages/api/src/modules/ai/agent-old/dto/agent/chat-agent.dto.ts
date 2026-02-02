import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from "class-validator";

import {
    AgentChatMessageDto,
    AgentConfigBaseDto,
    FormFieldConfigDto,
    ThirdPartyIntegrationConfigDto,
} from "./common-agent.dto";
import { UpdateAgentConfigDto } from "./update-agent.dto";

/**
 * 智能体对话DTO
 */
export class AgentChatDto extends AgentConfigBaseDto {
    /**
     * 响应模式
     * streaming: 流式模式（推荐）
     * blocking: 阻塞模式，等待执行完毕后返回结果
     */
    @IsOptional()
    @IsEnum(["streaming", "blocking"], {
        message: "响应模式必须是 streaming 或 blocking",
    })
    responseMode?: "streaming" | "blocking" = "streaming";

    /**
     * 消息列表（标准AI对话格式）
     */
    @IsNotEmpty({ message: "消息列表不能为空" })
    @IsArray({ message: "消息必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => AgentChatMessageDto)
    messages: AgentChatMessageDto[];

    /**
     * 对话记录ID（可选，如果没有则创建新对话）
     */
    @IsOptional()
    @IsUUID(4, { message: "对话记录ID必须是有效的UUID" })
    conversationId?: string;

    /**
     * 链路追踪ID（用于分布式追踪）
     */
    @IsOptional()
    @IsString({ message: "链路追踪ID必须是字符串" })
    traceId?: string;

    /**
     * 文件列表（用于文件上传和多媒体处理）
     */
    @IsOptional()
    @IsArray({ message: "文件列表必须是数组" })
    files?: Array<{
        type: string;
        url: string;
    }>;

    /**
     * 第三方平台集成配置（用于动态配置第三方平台）
     */
    @IsOptional()
    @Type(() => Object)
    thirdPartyIntegration?: ThirdPartyIntegrationConfigDto;

    /**
     * MCP服务器ID列表（可选）
     */
    @IsOptional()
    @IsArray({ message: "MCP服务器列表必须是数组" })
    @IsString({ each: true, message: "每个MCP服务器ID必须是字符串" })
    mcpServers?: string[];

    /**
     * 表单变量（用于角色设定中的变量替换）
     */
    @IsOptional()
    @Type(() => Object)
    formVariables?: Record<string, string>;

    /**
     * 是否保存对话记录（默认为true）
     */
    @IsOptional()
    @IsBoolean({ message: "保存对话记录必须是布尔值" })
    saveConversation?: boolean;

    /**
     * 对话标题（创建新对话时使用）
     */
    @IsOptional()
    @IsString({ message: "对话标题必须是字符串" })
    title?: string;

    /**
     * 是否包含上下文
     */
    @IsOptional()
    @IsBoolean({ message: "包含上下文必须是布尔值" })
    includeContext?: boolean;

    /**
     * 是否返回引用来源
     */
    @IsOptional()
    @IsBoolean({ message: "返回引用来源必须是布尔值" })
    includeReferences?: boolean;

    /**
     * 是否生成自动追问
     */
    @IsOptional()
    @IsBoolean({ message: "生成自动追问必须是布尔值" })
    generateSuggestions?: boolean;

    /**
     * 表单字段配置
     */
    @IsOptional()
    @IsArray({ message: "表单字段配置必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => FormFieldConfigDto)
    formFields?: FormFieldConfigDto[];

    /**
     * 表单字段输入值（用于预览和测试）
     */
    @IsOptional()
    formFieldsInputs?: Record<string, any>;

    /**
     * 扣费模式
     */
    @IsOptional()
    @IsEnum(["creator", "user", "all"], {
        message: "扣费模式必须是 creator 或 user 或 all",
    })
    billingMode?: "creator" | "user" | "all";
}

/**
 * 智能体对话响应DTO
 */
export interface AgentChatResponse {
    /**
     * 对话记录ID
     */
    conversationId: string;

    /**
     * AI回复内容
     */
    response: string;

    /**
     * 引用来源（如果启用）
     */
    referenceSources?: Array<{
        datasetId: string;
        datasetName: string;
        chunks: Array<{
            id: string;
            content: string;
            score: number;
            metadata?: Record<string, unknown>;
            fileName?: string;
            chunkIndex?: number;
        }>;
    }>;

    /**
     * 对话上下文（如果启用）
     */
    context?: Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: Date;
    }>;

    /**
     * 自动追问建议（如果启用）
     */
    suggestions?: string[];

    /**
     * Token使用统计
     */
    tokenUsage?: {
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
    };

    /**
     * 响应时间（毫秒）
     */
    responseTime: number;

    /**
     * 标注命中信息（如果匹配到标注）
     */
    annotations?: {
        annotationId: string;
        question: string;
        similarity: number;
        createdBy: string;
    };
}

/**
 * 智能体对话测试DTO
 */
export class AgentChatTestDto {
    /**
     * 用户消息
     */
    @IsNotEmpty({ message: "用户消息不能为空" })
    @IsString({ message: "用户消息必须是字符串" })
    message: string;

    /**
     * 智能体配置（前端传入的临时配置用于测试）
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => UpdateAgentConfigDto)
    agentConfig?: UpdateAgentConfigDto;

    /**
     * 对话历史
     */
    @IsOptional()
    @IsArray({ message: "对话历史必须是数组" })
    history?: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
}

/**
 * 批量删除对话记录DTO
 */
export class BatchDeleteChatRecordDto {
    /**
     * 对话记录ID列表
     */
    @IsNotEmpty({ message: "对话记录ID列表不能为空" })
    @IsArray({ message: "对话记录ID列表必须是数组" })
    @IsUUID(4, { each: true, message: "对话记录ID必须是有效的UUID" })
    recordIds: string[];
}
