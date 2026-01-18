import type { UIMessage } from "ai";
import { IsArray, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

export class ChatRequestDto {
    @ValidateIf((o) => !o.message)
    @IsArray({ message: "消息列表必须是数组" })
    messages?: UIMessage[];

    @ValidateIf((o) => !o.messages)
    @IsObject({ message: "消息必须是对象" })
    message?: UIMessage;

    @IsUUID(undefined, { message: "模型ID必须是有效的UUID格式" })
    @IsString({ message: "模型ID不能为空" })
    modelId: string;

    @IsUUID(4, { message: "对话ID必须是有效的UUID格式" })
    @IsOptional()
    conversationId?: string;

    @IsString({ message: "对话标题必须是字符串" })
    @IsOptional()
    title?: string;

    @IsString({ message: "系统提示词必须是字符串" })
    @IsOptional()
    systemPrompt?: string;

    @IsArray({ message: "MCP服务器ID列表必须是数组" })
    @IsOptional()
    mcpServerIds?: string[];

    @IsOptional()
    id?: string;

    @IsOptional()
    trigger?: string;

    @IsOptional()
    messageId?: string;

    @IsString()
    @IsOptional()
    parentId?: string;
}
