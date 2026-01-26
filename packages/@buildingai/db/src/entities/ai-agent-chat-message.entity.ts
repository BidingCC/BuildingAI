import type {
    AIRawResponse,
    MessageMetadata,
    TokenUsage,
} from "@buildingai/types/ai/agent-config.interface";
import type { Attachment, MessageContent } from "@buildingai/types/ai/message-content.interface";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { Agent } from "./ai-agent.entity";
import { AgentChatRecord } from "./ai-agent-chat-record.entity";
import { McpToolCall } from "./ai-chat-message.entity";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

/**
 * 智能体对话消息实体
 * 记录智能体对话中的每条消息
 */
@AppEntity({ name: "ai_agent_chat_message", comment: "智能体对话消息" })
@Index(["conversationId", "createdAt"])
export class AgentChatMessage extends BaseEntity {
    /**
     * 对话记录ID
     */
    @Column({
        type: "uuid",
        comment: "对话记录ID",
    })
    @Index()
    conversationId: string;

    /**
     * 智能体ID
     */
    @Column({
        type: "uuid",
        comment: "智能体ID",
    })
    @Index()
    agentId: string;

    /**
     * 用户ID (注册用户时使用)
     */
    @Column({
        type: "uuid",
        comment: "用户ID，匿名用户时为空",
        nullable: true,
    })
    @Index()
    userId?: string;

    /**
     * 匿名用户标识 (匿名用户时使用)
     */
    @Column({
        type: "varchar",
        length: 128,
        comment: "匿名用户标识，如设备ID或访问令牌的hash",
        nullable: true,
    })
    @Index()
    anonymousIdentifier?: string;

    /**
     * 消息角色
     */
    @Column({
        type: "enum",
        enum: ["user", "assistant", "system"],
        comment: "消息角色",
    })
    role: "user" | "assistant" | "system";

    /**
     * 消息内容
     * 支持字符串或数组格式（包含文本、图片、音频、视频等）
     */
    @Column({
        type: "jsonb",
        comment: "消息内容，支持字符串或数组格式",
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
    messageType: string;

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
     * Token使用统计
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "Token使用统计",
    })
    tokens?: TokenUsage;

    /**
     * 原始AI响应
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "原始AI响应数据",
    })
    rawResponse?: AIRawResponse;

    /**
     * 表单变量
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "用于角色设定的表单变量",
    })
    formVariables?: Record<string, string>;

    /**
     * 表单字段输入值
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "表单字段输入值",
    })
    formFieldsInputs?: Record<string, any>;

    /**
     * 扩展数据
     * 包含引用来源、上下文、建议等信息
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "扩展数据，包含引用来源、上下文、建议等信息",
    })
    metadata?: MessageMetadata;

    /**
     * MCP tool call records
     * Records MCP tool call status for this message
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "MCP tool call records",
    })
    mcpToolCalls?: McpToolCall[];

    /**
     * 关联的用户 (注册用户时使用)
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
        nullable: true,
    })
    @JoinColumn({ name: "user_id" })
    user?: User;

    /**
     * 关联的智能体
     */
    @ManyToOne(() => Agent, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "agent_id" })
    agent: Agent;

    /**
     * 关联的对话记录
     */
    @ManyToOne(() => AgentChatRecord, "messages", {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Relation<AgentChatRecord>;
}
