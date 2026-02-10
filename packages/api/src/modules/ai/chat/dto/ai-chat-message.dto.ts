import { isEnabled } from "@buildingai/utils";
import { CHAT_ROLE, type ChatRoleType } from "@common/constants";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from "class-validator";

/**
 * 聊天消息DTO
 */
export class AiChatMessageDto {
    /**
     * 消息角色
     */
    @IsEnum(CHAT_ROLE, { message: "消息角色必须是有效的角色类型" })
    role?: ChatRoleType;

    @IsOptional()
    content: string;
}

/**
 * 函数定义DTO
 */
export class ChatFunctionDto {
    /**
     * 函数名
     */
    @IsString({ message: "函数名必须是字符串" })
    @IsNotEmpty({ message: "函数名不能为空" })
    name: string;

    /**
     * 函数描述
     */
    @IsString({ message: "函数描述必须是字符串" })
    @IsOptional()
    description?: string;

    /**
     * 函数参数定义
     */
    @IsObject({ message: "函数参数定义必须是对象" })
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}

/**
 * 聊天请求DTO
 */
export class ChatRequestDto {
    /**
     * 使用的模型ID（可选，不传则使用默认模型）
     */
    @IsUUID(undefined, { message: "模型ID必须是有效的UUID格式" })
    @IsOptional()
    modelId: string;

    /**
     * 对话ID（如果是继续之前的对话）
     */
    @IsUUID(undefined, { message: "对话ID必须是有效的UUID格式" })
    @IsOptional()
    conversationId?: string;

    /**
     * 对话标题（用于新建对话时）
     */
    @IsString({ message: "对话标题必须是字符串" })
    @IsOptional()
    title?: string;

    /**
     * 是否保存对话记录
     */
    @IsBoolean({ message: "保存对话记录标识必须是布尔值" })
    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? isEnabled(value) : true))
    saveConversation?: boolean;

    /**
     * 聊天消息列表
     */
    @IsArray({ message: "聊天消息必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => AiChatMessageDto)
    messages: AiChatMessageDto[];

    /**
     * MCP服务器ID列表
     */
    @IsOptional()
    @IsArray({ message: "MCP服务器ID列表必须是数组" })
    mcpServerIds?: string[];
}

/**
 * 文案优化请求DTO
 */
export class TextOptimizationRequestDto {
    /**
     * 使用的模型ID（可选，不传则使用默认模型）
     */
    @IsUUID(undefined, { message: "模型ID必须是有效的UUID格式" })
    @IsOptional()
    modelId?: string;

    /**
     * 原始文案内容
     */
    @IsString({ message: "原始文案必须是字符串" })
    @IsNotEmpty({ message: "原始文案不能为空" })
    text: string;

    /**
     * 优化方向或风格（可选）
     * 例如：简洁、生动、专业、口语化等
     */
    @IsString({ message: "优化方向必须是字符串" })
    @IsOptional()
    optimizationStyle?: string;

    /**
     * 优化要求说明（可选）
     * 用户可以自定义优化要求
     */
    @IsString({ message: "优化要求必须是字符串" })
    @IsOptional()
    requirements?: string;
}
