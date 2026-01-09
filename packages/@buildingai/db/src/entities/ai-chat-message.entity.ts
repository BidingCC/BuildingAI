import type { UIMessage } from "ai";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { AiChatRecord } from "./ai-chat-record.entity";
import { AiModel } from "./ai-model.entity";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_chat_message", comment: "AI对话消息记录" })
@Index(["conversationId", "createdAt"])
export class AiChatMessage extends BaseEntity {
    @Column({
        type: "uuid",
        comment: "所属对话ID",
    })
    conversationId: string;

    @Column({
        type: "uuid",
        comment: "消息使用的AI模型ID",
    })
    @Index()
    modelId: string;

    @Column({
        type: "int",
        comment: "在对话中的消息序号",
    })
    @Index()
    sequence: number;

    @Column({
        type: "varchar",
        length: 36,
        nullable: true,
        comment: "父消息ID（用于消息树结构）",
    })
    @Index()
    parentId?: string;

    @Column({
        type: "jsonb",
        comment: "消息内容（包含 role 和 parts）",
    })
    message: UIMessage;

    @Column({
        type: "varchar",
        length: 20,
        default: "completed",
        comment: "消息状态: streaming-流式传输中, completed-已完成, failed-失败",
    })
    status: "streaming" | "completed" | "failed";

    @Column({
        type: "text",
        nullable: true,
        comment: "错误信息",
    })
    errorMessage?: string;

    @Column({
        type: "jsonb",
        nullable: true,
        comment: "Token使用情况",
    })
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    };

    @Column({
        type: "int",
        nullable: true,
        comment: "用户积分消耗",
    })
    userConsumedPower?: number;

    @ManyToOne(() => AiChatRecord, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Relation<AiChatRecord>;

    @ManyToOne(() => AiModel, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "model_id" })
    model: Relation<AiModel>;
}
