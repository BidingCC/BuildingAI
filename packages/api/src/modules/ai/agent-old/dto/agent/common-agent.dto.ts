import { type ModelBillingConfig } from "@buildingai/types/ai/agent-config.interface";
import type {
    Attachment as AttachmentType,
    MessageContent,
} from "@buildingai/types/ai/message-content.interface";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * 快捷指令配置DTO
 */
export class QuickCommandConfigDto {
    /**
     * 指令头像
     */
    @IsOptional()
    @IsString({ message: "指令头像必须是字符串" })
    avatar?: string;

    /**
     * 指令名称
     */
    @IsString({ message: "指令名称必须是字符串" })
    @IsNotEmpty({ message: "指令名称不能为空" })
    name: string;

    /**
     * 指令内容
     */
    @IsString({ message: "指令内容必须是字符串" })
    @IsNotEmpty({ message: "指令内容不能为空" })
    content: string;

    /**
     * 回复类型
     */
    @IsString({ message: "回复类型必须是字符串" })
    @IsNotEmpty({ message: "回复类型不能为空" })
    replyType: "custom" | "model";

    /**
     * 回复内容
     */
    @IsOptional()
    @IsString({ message: "回复内容必须是字符串" })
    replyContent?: string;
}

/**
 * 表单字段配置DTO
 */
export class FormFieldConfigDto {
    /**
     * 字段名
     */
    @IsString({ message: "字段名必须是字符串" })
    @IsNotEmpty({ message: "字段名不能为空" })
    name: string;

    /**
     * 字段标签
     */
    @IsString({ message: "字段标签必须是字符串" })
    @IsNotEmpty({ message: "字段标签不能为空" })
    label: string;

    /**
     * 字段类型
     */
    @IsString({ message: "字段类型必须是字符串" })
    @IsNotEmpty({ message: "字段类型不能为空" })
    type: "text" | "textarea" | "select";

    /**
     * 是否必填
     */
    @IsOptional()
    required?: boolean;

    /**
     * 字段最大长度
     */
    @IsOptional()
    @IsInt({ message: "字段最大长度必须是整数" })
    @Min(0, { message: "字段最大长度不能小于0" })
    maxLength?: number;

    /**
     * 选项列表（仅当type为select时使用）
     */
    @IsOptional()
    @IsArray({ message: "选项列表必须是数组" })
    options?:
        | string[]
        | Array<{
              label: string;
              value: string;
          }>;
}

/**
 * 附件信息DTO
 */
export class AttachmentDto {
    /**
     * 附件类型
     */
    @IsString({ message: "附件类型必须是字符串" })
    @IsNotEmpty({ message: "附件类型不能为空" })
    type: string;

    /**
     * 附件URL
     */
    @IsString({ message: "附件URL必须是字符串" })
    @IsNotEmpty({ message: "附件URL不能为空" })
    url: string;

    /**
     * 附件名称
     */
    @IsString({ message: "附件名称必须是字符串" })
    @IsOptional()
    name?: string;

    /**
     * 附件大小（字节）
     */
    @IsInt({ message: "附件大小必须是整数" })
    @Min(0, { message: "附件大小不能小于0" })
    @IsOptional()
    @Type(() => Number)
    size?: number;
}

/**
 * 智能体对话消息DTO
 */
export class AgentChatMessageDto {
    /**
     * 消息角色
     */
    @IsString({ message: "消息角色必须是字符串" })
    @IsNotEmpty({ message: "消息角色不能为空" })
    role: "user" | "assistant" | "system";

    /**
     * 消息内容
     * 支持字符串或数组格式（包含文本、图片、音频、视频等）
     */
    @IsOptional()
    content: MessageContent;

    /**
     * 附件信息
     */
    @IsArray({ message: "附件信息必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => AttachmentDto)
    @IsOptional()
    @Transform(({ value }) => value || [])
    attachments?: AttachmentType[];

    /**
     * 消息元数据
     */
    @IsOptional()
    @IsObject({ message: "消息元数据必须是对象" })
    metadata?: Record<string, any>;
}

/**
 * 模型配置DTO
 */
export class ModelConfigDto {
    /**
     * 模型ID
     */
    @IsOptional()
    @IsString({ message: "模型ID必须是字符串" })
    id?: string;

    /**
     * 模型参数配置
     */
    @IsOptional()
    @IsObject({ message: "模型参数必须是对象" })
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        stop?: string[];
        [key: string]: any;
    };
}

/**
 * 模型计费配置DTO
 */
export class ModelBillingConfigDto {
    @IsOptional()
    @IsNumber({}, { message: "价格必须是数字" })
    price: number;
}

/**
 * 第三方平台集成配置DTO
 */
export class ThirdPartyIntegrationConfigDto {
    /**
     * 应用/机器人ID
     */
    @IsOptional()
    @IsString({ message: "应用ID必须是字符串" })
    appId?: string;

    /**
     * API 密钥
     */
    @IsOptional()
    @IsString({ message: "API密钥必须是字符串" })
    apiKey?: string;

    /**
     * API 端点地址
     */
    @IsOptional()
    @IsString({ message: "API端点地址必须是字符串" })
    baseURL?: string;

    /**
     * 扩展配置
     */
    @IsOptional()
    @IsObject({ message: "扩展配置必须是对象" })
    extendedConfig?: Record<string, any>;

    /**
     * 变量映射配置
     */
    @IsOptional()
    @IsObject({ message: "变量映射配置必须是对象" })
    variableMapping?: Record<string, string>;

    /**
     * 是否使用平台的对话历史管理
     */
    @IsOptional()
    @IsBoolean({ message: "使用外部对话历史必须是布尔值" })
    useExternalConversation?: boolean;
}

/**
 * 自动追问配置DTO
 */
export class AutoQuestionsConfigDto {
    /**
     * 是否启用自动追问
     */
    @IsBoolean({ message: "启用状态必须是布尔值" })
    enabled: boolean;

    /**
     * 是否启用自定义规则
     */
    @IsBoolean({ message: "自定义规则启用状态必须是布尔值" })
    customRuleEnabled: boolean;

    /**
     * 自定义规则
     */
    @IsOptional()
    @IsString({ message: "自定义规则必须是字符串" })
    customRule?: string;
}

/**
 * 智能体配置基础DTO
 * 包含 UpdateAgentConfigDto 和 AgentChatDto 的共用字段
 */
export class AgentConfigBaseDto {
    /**
     * 角色设定
     */
    @IsOptional()
    @IsString({ message: "角色设定必须是字符串" })
    rolePrompt?: string;

    /**
     * 是否显示对话上下文
     */
    @IsOptional()
    @IsBoolean({ message: "显示对话上下文必须是布尔值" })
    showContext?: boolean;

    /**
     * 是否显示引用来源
     */
    @IsOptional()
    @IsBoolean({ message: "显示引用来源必须是布尔值" })
    showReference?: boolean;

    /**
     * 是否允许反馈
     */
    @IsOptional()
    @IsBoolean({ message: "允许反馈必须是布尔值" })
    enableFeedback?: boolean;

    /**
     * 是否开启联网搜索
     */
    @IsOptional()
    @IsBoolean({ message: "开启联网搜索必须是布尔值" })
    enableWebSearch?: boolean;

    /**
     * 模型配置
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => ModelConfigDto)
    modelConfig?: ModelConfigDto;

    /**
     * 智能体计费配置
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => ModelBillingConfigDto)
    billingConfig?: ModelBillingConfig;

    /**
     * 知识库ID列表
     */
    @IsOptional()
    @IsArray({ message: "知识库ID列表必须是数组" })
    @IsUUID(4, { each: true, message: "知识库ID必须是有效的UUID" })
    datasetIds?: string[];

    /**
     * 自动追问配置
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => AutoQuestionsConfigDto)
    autoQuestions?: AutoQuestionsConfigDto;

    /**
     * 快捷指令配置
     */
    @IsOptional()
    @IsArray({ message: "快捷指令必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => QuickCommandConfigDto)
    quickCommands?: QuickCommandConfigDto[];

    /**
     * MCP服务器ID列表
     * 智能体可使用的MCP工具服务器列表
     */
    @IsOptional()
    @IsArray({ message: "MCP服务器ID列表必须是数组" })
    @IsString({ each: true, message: "每个MCP服务器ID必须是字符串" })
    mcpServerIds?: string[];
}
