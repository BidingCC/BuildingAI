import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, OneToMany, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";
import { DatasetsChatMessage } from "./datasets-chat-message.entity";
import { User } from "./user.entity";

/**
 * 知识库调试对话记录
 */
@AppEntity({ name: "datasets_chat_record", comment: "知识库调试对话记录" })
@Index(["datasetId", "createdAt"])
@Index(["userId", "createdAt"])
@Index(["isDeleted", "createdAt"])
export class DatasetsChatRecord extends BaseEntity {
    /**
     * 关联的知识库ID
     */
    @Column({
        type: "uuid",
        comment: "关联的知识库ID",
    })
    @Index()
    datasetId: string;

    /**
     * 用户ID（调试人）
     */
    @Column({
        type: "uuid",
        comment: "用户ID（调试人）",
    })
    @Index()
    userId: string;

    /**
     * 对话标题
     */
    @Column({
        type: "varchar",
        length: 200,
        comment: "对话标题",
        nullable: true,
    })
    title?: string;

    /**
     * AI模型ID
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "使用的AI模型ID",
    })
    modelId?: string;

    /**
     * 对话摘要
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "对话摘要",
    })
    summary?: string;

    /**
     * 消息总数
     */
    @Column({
        type: "int",
        default: 0,
        comment: "对话中的消息总数",
    })
    messageCount: number;

    /**
     * 总Token消耗
     */
    @Column({
        type: "int",
        default: 0,
        comment: "本次对话消耗的总Token数",
    })
    totalTokens: number;

    /**
     * 对话配置
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "对话相关配置，如温度、最大令牌数等",
    })
    config?: Record<string, any>;

    /**
     * 对话状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "active",
        comment: "对话状态: active-进行中, completed-已完成, failed-失败, cancelled-已取消",
    })
    @Index()
    status: "active" | "completed" | "failed" | "cancelled";

    /**
     * 是否删除（软删除）
     */
    @Column({
        type: "boolean",
        default: false,
        comment: "是否已删除",
    })
    @Index()
    isDeleted: boolean;

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
     * 关联的知识库
     */
    @ManyToOne(() => Datasets, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "dataset_id" })
    dataset: Relation<Datasets>;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: Relation<User>;

    /**
     * 对话中的消息列表
     */
    @OneToMany(() => DatasetsChatMessage, (message) => message.conversation, {
        cascade: true,
    })
    messages: Relation<DatasetsChatMessage[]>;
}
