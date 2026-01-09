import type { UIMessage } from "ai";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class ChatRequestDto {
    @IsArray({ message: "消息列表必须是数组" })
    messages: UIMessage[];

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

    @IsArray({ message: "MCP服务器列表必须是数组" })
    @IsOptional()
    mcpServers?: string[];

    @IsOptional()
    id?: string;

    @IsOptional()
    trigger?: string;

    @IsUUID(4, { message: "消息ID必须是有效的UUID格式" })
    @IsOptional()
    messageId?: string;
}
