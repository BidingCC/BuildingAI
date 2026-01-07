import type { Attachment, MessageContent } from "@buildingai/types/ai/message-content.interface";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, OneToMany, type Relation } from "../typeorm";
import { AiChatRecord } from "./ai-chat-record.entity";
import { AiChatToolCall } from "./ai-chat-tool-call.entity";
import { AiModel } from "./ai-model.entity";
import { BaseEntity } from "./base";

/**
 * 对话消息实体
 * 存储对话中的具体消息内容
 */
@AppEntity({ name: "ai_chat_message", comment: "AI对话消息记录" })
@Index(["conversationId", "createdAt"])
@Index(["role", "createdAt"])
export class AiChatMessage extends BaseEntity {
    /**
     * 对话ID
     */
    @Column({
        type: "uuid",
        comment: "所属对话ID",
    })
    conversationId: string;

    /**
     * 使用的AI模型ID
     */
    @Column({
        type: "uuid",
        comment: "消息使用的AI模型ID",
    })
    @Index()
    modelId: string;

    /**
     * 消息角色
     */
    @Column({
        type: "varchar",
        length: 20,
        comment:
            "消息角色: system-系统, user-用户, assistant-助手, tool-工具结果, function-函数调用, data-数据",
    })
    @Index()
    role: "system" | "user" | "assistant" | "tool" | "function" | "data";

    /**
     * 工具/函数名称
     * 当 role 为 tool 或 function 时使用
     */
    @Column({
        type: "varchar",
        length: 100,
        nullable: true,
        comment: "工具/函数名称（role为tool/function时使用）",
    })
    name?: string;

    /**
     * 工具调用ID
     * 当 role 为 tool 时，关联到对应的工具调用
     */
    @Column({
        type: "varchar",
        length: 100,
        nullable: true,
        comment: "工具调用ID（role为tool时使用，关联tool_calls中的id）",
    })
    toolCallId?: string;

    /**
     * 父消息ID
     * 用于关联工具调用链，如 assistant 消息调用工具，tool 消息是结果
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "父消息ID（用于工具调用链的关联）",
    })
    @Index()
    parentMessageId?: string;

    /**
     * 消息内容
     */
    @Column({
        type: "jsonb",
        comment: "消息文本内容",
    })
    content: MessageContent;

    /**
     * 消息类型
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "text",
        comment: "消息类型: text-文本, image-图片, file-文件",
    })
    messageType: "text" | "image" | "file";

    /**
     * 附件信息
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "附件信息，包含文件URL、类型等",
    })
    attachments?: Attachment[];

    /**
     * Token使用情况
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "Token使用情况，包含promptTokens、completionTokens、totalTokens、cachedTokens等",
    })
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        cachedTokens?: number;
    };

    /**
     * 完成原因
     */
    @Column({
        type: "varchar",
        length: 30,
        nullable: true,
        comment:
            "完成原因: stop-正常结束, length-达到最大长度, tool-calls-工具调用, content-filter-内容过滤, error-错误, other-其他",
    })
    @Index()
    finishReason?: "stop" | "length" | "tool-calls" | "content-filter" | "error" | "other";

    /**
     * 用户积分消耗
     */
    @Column({
        type: "int",
        nullable: true,
        comment: "用户积分消耗",
    })
    userConsumedPower?: number;

    /**
     * 消息状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "completed",
        comment:
            "消息状态: sending-发送中, streaming-流式传输中, completed-已完成, failed-失败, cancelled-已取消",
    })
    status: "sending" | "streaming" | "completed" | "failed" | "cancelled";

    /**
     * 错误信息
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "错误信息（当状态为failed时）",
    })
    errorMessage?: string;

    /**
     * 消息序号
     */
    @Column({
        type: "int",
        comment: "在对话中的消息序号",
    })
    @Index()
    sequence: number;

    /**
     * 处理时长（毫秒）
     */
    @Column({
        type: "int",
        nullable: true,
        comment: "AI处理该消息的时长（毫秒）",
    })
    processingTime?: number;

    /**
     * 模型响应的原始数据
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "模型响应的原始数据",
    })
    rawResponse?: Record<string, any>;

    /**
     * 扩展数据
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "扩展数据字段",
    })
    metadata?: Record<string, any>;

    /**
     * 工具调用记录
     * JSONB格式，用于快速查询
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "工具调用记录（JSONB格式，用于快速查询）",
    })
    toolCalls?: Array<{
        id: string;
        type: "function" | "mcp";
        name: string;
        arguments?: Record<string, any>;
        result?: Record<string, any>;
        error?: string;
        duration?: number;
        mcpServerId?: string;
    }>;

    /**
     * 推理内容
     * 用于存储模型的思考过程
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "推理内容（模型的思考过程）",
    })
    reasoning?: {
        content?: string;
        startTime?: number;
        endTime?: number;
    };

    /**
     * 所属对话
     */
    @ManyToOne(() => AiChatRecord, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Relation<AiChatRecord>;

    /**
     * 使用的AI模型
     */
    @ManyToOne(() => AiModel, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "model_id" })
    model: Relation<AiModel>;

    /**
     * 父消息关联
     */
    @ManyToOne(() => AiChatMessage, (message) => message.childMessages, {
        nullable: true,
        onDelete: "SET NULL",
    })
    @JoinColumn({ name: "parent_message_id" })
    parentMessage?: Relation<AiChatMessage>;

    /**
     * 子消息列表（工具调用结果等）
     */
    @OneToMany(() => AiChatMessage, (message) => message.parentMessage)
    childMessages?: Relation<AiChatMessage[]>;

    /**
     * 关联的工具调用记录
     */
    @OneToMany(() => AiChatToolCall, (toolCall) => toolCall.message, {
        cascade: true,
    })
    toolCallRecords?: Relation<AiChatToolCall[]>;
}
