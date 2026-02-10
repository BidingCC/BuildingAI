import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { AiChatMessage } from "./ai-chat-message.entity";
import { AiChatRecord } from "./ai-chat-record.entity";
import { AiMcpServer } from "./ai-mcp-server.entity";
import { BaseEntity } from "./base";

/**
 * 对话工具调用实体
 * 用于详细记录对话中的工具调用情况
 */
@AppEntity({ name: "ai_chat_tool_call", comment: "对话工具调用记录" })
@Index(["messageId", "sequence"])
@Index(["conversationId", "createdAt"])
@Index(["status", "createdAt"])
export class AiChatToolCall extends BaseEntity {
    /**
     * 关联的消息ID
     * 工具调用是由哪条 assistant 消息发起的
     */
    @Column({
        type: "uuid",
        comment: "关联的消息ID（工具调用发起消息）",
    })
    @Index()
    messageId: string;

    /**
     * 所属会话ID
     */
    @Column({
        type: "uuid",
        comment: "所属会话ID",
    })
    @Index()
    conversationId: string;

    /**
     * 工具调用ID
     * 工具调用的唯一标识符
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "工具调用唯一标识符",
    })
    @Index()
    toolCallId: string;

    /**
     * 工具类型
     */
    @Column({
        type: "varchar",
        length: 20,
        comment: "工具类型: function-函数调用, mcp-MCP工具",
    })
    @Index()
    type: "function" | "mcp";

    /**
     * 工具名称
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "工具名称",
    })
    @Index()
    name: string;

    /**
     * 调用参数
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "工具调用参数",
    })
    arguments?: Record<string, any>;

    /**
     * 执行结果
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "工具执行结果",
    })
    result?: Record<string, any>;

    /**
     * 执行状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "pending",
        comment: "执行状态: pending-等待执行, executing-执行中, completed-已完成, failed-失败",
    })
    @Index()
    status: "pending" | "executing" | "completed" | "failed";

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
     * 执行耗时（毫秒）
     */
    @Column({
        type: "int",
        nullable: true,
        comment: "工具执行耗时（毫秒）",
    })
    duration?: number;

    /**
     * MCP服务器ID
     * 当 type 为 mcp 时使用
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "MCP服务器ID（type为mcp时使用）",
    })
    @Index()
    mcpServerId?: string;

    /**
     * 在同一消息中的调用序号
     */
    @Column({
        type: "int",
        comment: "在同一消息中的工具调用序号",
    })
    sequence: number;

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
     * 关联的消息
     */
    @ManyToOne(() => AiChatMessage, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "message_id" })
    message: Relation<AiChatMessage>;

    /**
     * 所属会话
     */
    @ManyToOne(() => AiChatRecord, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Relation<AiChatRecord>;

    /**
     * MCP服务器（如果是MCP工具）
     */
    @ManyToOne(() => AiMcpServer, {
        nullable: true,
        onDelete: "SET NULL",
    })
    @JoinColumn({ name: "mcp_server_id" })
    mcpServer?: Relation<AiMcpServer>;
}
