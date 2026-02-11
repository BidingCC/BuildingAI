import {
    RETRIEVAL_MODE,
    type RetrievalModeType,
} from "@buildingai/constants/shared/datasets.constants";
import type { RetrievalConfig } from "@buildingai/types/ai/retrieval-config.interface";

import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, JoinTable, ManyToMany, OneToMany, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { DatasetsChatRecord } from "./datasets-chat-record.entity";
import { DatasetsDocument } from "./datasets-document.entity";
import { DatasetMember } from "./datasets-member.entity";
import { DatasetMemberApplication } from "./datasets-member-application.entity";
import { DatasetsSegments } from "./datasets-segments.entity";
import { Tag } from "./tag.entity";

/**
 * 发布到广场的审核状态
 */
export enum SquarePublishStatus {
    /** 未申请或已撤销 */
    NONE = "none",
    /** 待审核 */
    PENDING = "pending",
    /** 审核通过（已上架） */
    APPROVED = "approved",
    /** 已拒绝 */
    REJECTED = "rejected",
}

/**
 * 知识库实体
 */
@AppEntity({ name: "datasets", comment: "知识库管理" })
export class Datasets extends BaseEntity {
    /**
     * 知识库名称
     */
    @Column({ length: 255, comment: "知识库名称" })
    name: string;

    /**
     * 知识库描述
     */
    @Column({ type: "text", nullable: true, comment: "知识库描述" })
    description?: string;

    @Column({ type: "varchar", length: 512, nullable: true, comment: "封面图 URL" })
    coverUrl?: string | null;

    /**
     * Embedding 模型ID
     */
    @Column({ type: "uuid", comment: "Embedding模型ID", nullable: true })
    embeddingModelId?: string;

    /**
     * 检索模式
     */
    @Column({
        type: "enum",
        enum: Object.values(RETRIEVAL_MODE),
        default: RETRIEVAL_MODE.VECTOR,
        comment: "检索模式",
    })
    retrievalMode: RetrievalModeType;

    /**
     * 检索配置 JSON
     */
    @Column({ type: "json", comment: "检索配置" })
    retrievalConfig: RetrievalConfig;

    /**
     * 创建者ID
     */
    @Column({ type: "uuid", comment: "创建者ID" })
    createdBy: string;

    /**
     * 文档数量
     */
    @Column({ type: "int", default: 0, comment: "文档数量" })
    documentCount: number;

    /**
     * 总分段数量
     */
    @Column({ type: "int", default: 0, comment: "总分段数量" })
    chunkCount: number;

    /**
     * 存储空间大小（字节）
     */
    @Column({ type: "bigint", default: 0, comment: "存储空间大小（字节）" })
    storageSize: number;

    /**
     * 是否已发布到广场
     */
    @Column({ type: "boolean", default: false, comment: "是否已发布到广场" })
    publishedToSquare: boolean;

    /**
     * 发布到广场的时间
     */
    @Column({ type: "timestamptz", nullable: true, comment: "发布到广场的时间" })
    publishedAt?: Date | null;

    /**
     * 发布到广场的审核状态
     */
    @Column({
        type: "enum",
        enum: SquarePublishStatus,
        default: SquarePublishStatus.NONE,
        comment:
            "发布到广场审核状态：none-未申请/已撤销，pending-待审核，approved-已通过，rejected-已拒绝",
    })
    squarePublishStatus: SquarePublishStatus;

    /**
     * 广场发布审核人ID
     */
    @Column({ type: "uuid", nullable: true, comment: "广场发布审核人ID" })
    squareReviewedBy?: string | null;

    /**
     * 广场发布审核时间
     */
    @Column({ type: "timestamptz", nullable: true, comment: "广场发布审核时间" })
    squareReviewedAt?: Date | null;

    /**
     * 广场发布拒绝原因
     */
    @Column({ type: "text", nullable: true, comment: "广场发布拒绝原因" })
    squareRejectReason?: string | null;

    @Column({ type: "boolean", default: true, comment: "成员加入是否需要审核" })
    memberJoinApprovalRequired: boolean;

    /**
     * 知识库下的文档列表
     */
    @OneToMany(() => DatasetsDocument, (document) => document.dataset)
    documents?: Relation<DatasetsDocument[]>;

    /**
     * 知识库下的分段列表
     */
    @OneToMany(() => DatasetsSegments, (segment) => segment.dataset)
    segments?: Relation<DatasetsSegments[]>;

    /**
     * 知识库团队成员列表
     */
    @OneToMany(() => DatasetMember, (member) => member.dataset)
    members?: Relation<DatasetMember[]>;

    /**
     * 知识库会员申请列表
     */
    @OneToMany(() => DatasetMemberApplication, (application) => application.dataset)
    memberApplications?: Relation<DatasetMemberApplication[]>;

    @OneToMany(() => DatasetsChatRecord, (record) => record.dataset)
    chatRecords?: Relation<DatasetsChatRecord[]>;

    @ManyToMany(() => Tag, (tag) => tag.datasets)
    @JoinTable({
        name: "datasets_tags",
        joinColumn: { name: "dataset_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
    })
    tags?: Tag[];

    relatedAgentCount?: number;
}
