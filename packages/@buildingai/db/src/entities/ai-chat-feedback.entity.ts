import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { AiChatMessage } from "./ai-chat-message.entity";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

@AppEntity({ name: "ai_chat_feedback", comment: "AI对话反馈" })
@Index(["messageId", "userId"])
export class AiChatFeedback extends BaseEntity {
    @Column({
        type: "uuid",
        comment: "消息ID",
    })
    @Index()
    messageId: string;

    @Column({
        type: "uuid",
        nullable: true,
        comment: "用户ID",
    })
    @Index()
    userId?: string;

    @Column({
        type: "varchar",
        length: 20,
        comment: "反馈类型: like-点赞, dislike-踩",
    })
    type: "like" | "dislike";

    @Column({
        type: "varchar",
        length: 100,
        nullable: true,
        comment: "不喜欢的原因",
    })
    dislikeReason?: string;

    @Column({
        type: "decimal",
        precision: 3,
        scale: 2,
        default: 0.5,
        comment: "置信度分数 (0-1)，用于智能判断：用户是否犹豫、是否连续点踩、是否撤销",
    })
    confidenceScore: number;

    @ManyToOne(() => AiChatMessage, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "message_id" })
    message: Relation<AiChatMessage>;

    @ManyToOne(() => User, {
        onDelete: "CASCADE",
        nullable: true,
    })
    @JoinColumn({ name: "user_id" })
    user?: Relation<User>;
}
