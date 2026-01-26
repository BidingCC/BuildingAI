import { McpToolCall } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import type {
    Attachment as AttachmentType,
    MessageContent,
} from "@buildingai/types/ai/message-content.interface";
import { isEnabled } from "@buildingai/utils";
import { Transform, Type } from "class-transformer";
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * 对话状态枚举
 */
export enum ConversationStatus {
    ACTIVE = "active",
    COMPLETED = "completed",
    FAILED = "failed",
}

/**
 * 消息角色枚举
 */
export enum MessageRole {
    USER = "user",
    ASSISTANT = "assistant",
    SYSTEM = "system",
}

/**
 * 消息类型枚举
 */
export enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    FILE = "file",
}

/**
 * 创建对话DTO
 */
export class CreateAIChatRecordDto {
    /**
     * 对话标题
     */
    @IsOptional()
    @IsString({ message: "对话标题必须是字符串" })
    @MaxLength(200, { message: "对话标题长度不能超过200个字符" })
    title?: string;

    /**
     * 对话摘要
     */
    @IsString({ message: "对话摘要必须是字符串" })
    @IsOptional()
    @MaxLength(1000, { message: "对话摘要长度不能超过1000个字符" })
    summary?: string;

    /**
     * 对话配置
     */
    @IsObject({ message: "对话配置必须是对象" })
    @IsOptional()
    @Transform(({ value }) => value || {})
    config?: Record<string, any>;

    /**
     * 是否置顶
     */
    @IsBoolean({ message: "置顶状态必须是布尔值" })
    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? value : false))
    isPinned?: boolean;

    /**
     * 扩展数据
     */
    @IsObject({ message: "扩展数据必须是对象" })
    @IsOptional()
    @Transform(({ value }) => value || {})
    metadata?: Record<string, any>;
}

/**
 * 更新对话DTO
 */
export class UpdateAIChatRecordDto {
    /**
     * 对话标题
     */
    @IsString({ message: "对话标题必须是字符串" })
    @IsOptional()
    @MaxLength(200, { message: "对话标题长度不能超过200个字符" })
    title?: string;

    /**
     * 对话摘要
     */
    @IsString({ message: "对话摘要必须是字符串" })
    @IsOptional()
    @MaxLength(1000, { message: "对话摘要长度不能超过1000个字符" })
    summary?: string;

    /**
     * 对话状态
     */
    @IsEnum(ConversationStatus, { message: "对话状态必须是有效的枚举值" })
    @IsOptional()
    status?: ConversationStatus;

    /**
     * 是否置顶
     */
    @IsBoolean({ message: "置顶状态必须是布尔值" })
    @IsOptional()
    isPinned?: boolean;

    /**
     * 对话配置
     */
    @IsObject({ message: "对话配置必须是对象" })
    @IsOptional()
    config?: Record<string, any>;

    /**
     * 扩展数据
     */
    @IsObject({ message: "扩展数据必须是对象" })
    @IsOptional()
    metadata?: Record<string, any>;
}

/**
 * 查询对话DTO
 */
export class QueryAIChatRecordDto extends PaginationDto {
    /**
     * AI模型ID筛选
     */
    @IsOptional()
    modelId?: string;

    /**
     * 对话状态筛选
     */
    @IsEnum(ConversationStatus, { message: "对话状态必须是有效的枚举值" })
    @IsOptional()
    status?: ConversationStatus;

    /**
     * 是否置顶筛选
     */
    @IsBoolean({ message: "置顶状态必须是布尔值" })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return value;
        return isEnabled(value);
    })
    isPinned?: boolean;

    /**
     * 搜索关键词（标题或摘要）
     */
    @IsString({ message: "搜索关键词必须是字符串" })
    @IsOptional()
    @MaxLength(100, { message: "搜索关键词长度不能超过100个字符" })
    keyword?: string;

    /**
     * 用户名筛选
     */
    @IsString({ message: "用户名必须是字符串" })
    @IsOptional()
    @MaxLength(50, { message: "用户名长度不能超过50个字符" })
    username?: string;

    /**
     * 创建时间范围-开始时间
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (!value || value === "") return undefined;
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    })
    startDate?: Date;

    /**
     * 创建时间范围-结束时间
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (!value || value === "") return undefined;
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    })
    endDate?: Date;
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
 * Token使用情况DTO
 */
export class TokenUsageDto {
    /**
     * 提示Token数
     */
    @IsInt({ message: "提示Token数必须是整数" })
    @Min(0, { message: "提示Token数不能小于0" })
    @IsOptional()
    @Type(() => Number)
    prompt_tokens?: number;

    /**
     * 完成Token数
     */
    @IsInt({ message: "完成Token数必须是整数" })
    @Min(0, { message: "完成Token数不能小于0" })
    @IsOptional()
    @Type(() => Number)
    completion_tokens?: number;

    /**
     * 总Token数
     */
    @IsInt({ message: "总Token数必须是整数" })
    @Min(0, { message: "总Token数不能小于0" })
    @IsOptional()
    @Type(() => Number)
    total_tokens?: number;
}

/**
 * 创建消息DTO
 */
export class CreateMessageDto {
    /**
     * 使用的模型ID（可选，不传则使用默认模型）
     */
    @IsUUID(undefined, { message: "模型ID必须是有效的UUID格式" })
    @IsOptional()
    modelId: string;

    /**
     * 对话ID
     */
    @IsString({ message: "对话ID必须是字符串" })
    @IsNotEmpty({ message: "对话ID不能为空" })
    @IsUUID(4, { message: "对话ID必须是有效的UUID格式" })
    conversationId: string;

    /**
     * 用户积分消耗
     */
    @IsInt({ message: "用户积分消耗必须是整数" })
    @Min(0, { message: "用户积分消耗不能小于0" })
    @IsOptional()
    @Type(() => Number)
    userConsumedPower?: number;

    /**
     * 消息角色
     */
    @IsEnum(MessageRole, { message: "消息角色必须是有效的枚举值" })
    role: MessageRole;

    /**
     * 消息内容
     */
    @IsOptional()
    content: MessageContent;

    /**
     * 消息类型
     */
    @IsEnum(MessageType, { message: "消息类型必须是有效的枚举值" })
    @IsOptional()
    @Transform(({ value }) => value || MessageType.TEXT)
    messageType?: MessageType;

    /**
     * 错误信息
     */
    @IsString({ message: "错误信息必须是字符串" })
    @IsOptional()
    errorMessage?: string;

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
     * Token使用情况
     */
    @ValidateNested()
    @Type(() => TokenUsageDto)
    @IsOptional()
    tokens?: TokenUsageDto;

    /**
     * 处理时长（毫秒）
     */
    @IsInt({ message: "处理时长必须是整数" })
    @Min(0, { message: "处理时长不能小于0" })
    @IsOptional()
    @Type(() => Number)
    processingTime?: number;

    /**
     * 模型响应的原始数据
     */
    @IsObject({ message: "原始响应数据必须是对象" })
    @IsOptional()
    rawResponse?: Record<string, any>;

    /**
     * 扩展数据
     */
    @IsObject({ message: "扩展数据必须是对象" })
    @IsOptional()
    @Transform(({ value }) => value || {})
    metadata?: Record<string, any>;

    /**
     * MCP工具调用记录
     */
    @IsArray({ message: "MCP工具调用记录必须是数组" })
    @IsOptional()
    mcpToolCalls?: McpToolCall[];
}

/**
 * 更新消息DTO
 */
export class UpdateMessageDto {
    /**
     * 消息内容
     */
    @IsString({ message: "消息内容必须是字符串" })
    @IsOptional()
    content?: string;

    /**
     * 消息状态
     */
    @IsEnum(["sending", "completed", "failed"], {
        message: "消息状态必须是有效的枚举值",
    })
    @IsOptional()
    status?: "sending" | "completed" | "failed";

    /**
     * 错误信息
     */
    @IsString({ message: "错误信息必须是字符串" })
    @IsOptional()
    errorMessage?: string;

    /**
     * Token使用情况
     */
    @ValidateNested()
    @Type(() => TokenUsageDto)
    @IsOptional()
    tokens?: TokenUsageDto;

    /**
     * 处理时长（毫秒）
     */
    @IsInt({ message: "处理时长必须是整数" })
    @Min(0, { message: "处理时长不能小于0" })
    @IsOptional()
    @Type(() => Number)
    processingTime?: number;

    /**
     * 模型响应的原始数据
     */
    @IsObject({ message: "原始响应数据必须是对象" })
    @IsOptional()
    rawResponse?: Record<string, any>;

    /**
     * 扩展数据
     */
    @IsObject({ message: "扩展数据必须是对象" })
    @IsOptional()
    metadata?: Record<string, any>;
}

/**
 * 查询消息DTO
 */
export class QueryMessageDto {
    /**
     * 对话ID筛选
     */
    @IsString({ message: "对话ID必须是字符串" })
    @IsOptional()
    @IsUUID(4, { message: "对话ID必须是有效的UUID格式" })
    conversationId?: string;

    /**
     * 消息角色筛选
     */
    @IsEnum(MessageRole, { message: "消息角色必须是有效的枚举值" })
    @IsOptional()
    role?: MessageRole;

    /**
     * 消息类型筛选
     */
    @IsEnum(MessageType, { message: "消息类型必须是有效的枚举值" })
    @IsOptional()
    messageType?: MessageType;

    /**
     * 消息状态筛选
     */
    @IsEnum(["sending", "completed", "failed"], {
        message: "消息状态必须是有效的枚举值",
    })
    @IsOptional()
    status?: "sending" | "completed" | "failed";

    /**
     * 搜索关键词（消息内容）
     */
    @IsString({ message: "搜索关键词必须是字符串" })
    @IsOptional()
    @MaxLength(100, { message: "搜索关键词长度不能超过100个字符" })
    keyword?: string;

    /**
     * 创建时间范围-开始时间
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (!value || value === "") return undefined;
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    })
    startDate?: Date;

    /**
     * 创建时间范围-结束时间
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (!value || value === "") return undefined;
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    })
    endDate?: Date;
}

/**
 * 批量删除对话DTO
 */
export class BatchDeleteConversationDto {
    /**
     * 对话ID数组
     */
    @IsArray({ message: "对话ID列表必须是数组" })
    @ArrayNotEmpty({ message: "对话ID列表不能为空" })
    @IsUUID("all", { each: true, message: "每个对话ID必须是有效的UUID格式" })
    ids: string[];
}
