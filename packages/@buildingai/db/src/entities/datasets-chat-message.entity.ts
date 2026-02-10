import type { ChatMessageUsage } from "@buildingai/types";
import type { UIMessage } from "ai";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { AiModel } from "./ai-model.entity";
import { BaseEntity } from "./base";
import { DatasetsChatRecord } from "./datasets-chat-record.entity";

/**
 * 知识库调试对话消息
 * 仅用于 datasets 知识库效果调试，不包含反馈功能
 */
@AppEntity({ name: "datasets_chat_message", comment: "知识库调试对话消息" })
@Index(["conversationId", "createdAt"])
export class DatasetsChatMessage extends BaseEntity {
    @Column({
        type: "uuid",
        comment: "所属对话ID",
    })
    conversationId: string;

    @Column({
        type: "uuid",
        comment: "消息使用的AI模型ID",
        nullable: true,
    })
    @Index()
    modelId?: string;

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
        type: "varchar",
        length: 64,
        nullable: true,
        comment: "前端消息ID（用于映射前端临时ID到数据库ID）",
    })
    @Index()
    frontendId?: string;

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
    usage?: ChatMessageUsage;

    @ManyToOne(() => DatasetsChatRecord, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Relation<DatasetsChatRecord>;

    @ManyToOne(() => AiModel, {
        onDelete: "SET NULL",
        nullable: true,
    })
    @JoinColumn({ name: "model_id" })
    model?: Relation<AiModel>;
}
