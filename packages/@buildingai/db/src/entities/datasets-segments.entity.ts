import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";
import { DatasetsDocument } from "./datasets-document.entity";

/**
 * 向量块实体
 * 用于存储文档分段后的内容和向量信息
 */
@AppEntity({ name: "datasets_segments", comment: "知识库分段" })
export class DatasetsSegments extends BaseEntity {
    /**
     * 关联的文档ID
     */
    @Column({ type: "uuid", comment: "关联的文档ID", name: "document_id" })
    documentId: string;

    /**
     * 关联的知识库ID
     */
    @Column({ type: "uuid", comment: "关联的知识库ID", name: "dataset_id" })
    datasetId: string;

    /**
     * 文本内容
     */
    @Column({ type: "text", comment: "文本内容" })
    content: string;

    /**
     * 块在文档中的索引位置
     */
    @Column({ type: "integer", comment: "块在文档中的索引位置" })
    chunkIndex: number;

    /**
     * 文本内容长度
     */
    @Column({ type: "integer", comment: "文本内容长度" })
    contentLength: number;

    /**
     * 子块内容列表（父子分段模式使用）
     */
    @Column({ type: "json", nullable: true, comment: "子块内容列表" })
    children?: string[];

    /**
     * 元数据信息
     */
    @Column({ type: "jsonb", nullable: true, comment: "元数据信息" })
    metadata: Record<string, any>;

    /**
     * 向量数据
     */
    @Column({ type: "float", array: true, nullable: true, comment: "向量数据" })
    embedding: number[];

    /**
     * 向量维度
     */
    @Column({ type: "integer", nullable: true, comment: "向量维度" })
    vectorDimension: number;

    /**
     * 向量化状态：pending-等待处理，processing-处理中，completed-已完成，failed-失败
     */
    @Column({ type: "varchar", length: 50, comment: "向量化状态" })
    status: "pending" | "processing" | "completed" | "failed" = "pending";

    /**
     * 向量化错误信息
     */
    @Column({ type: "text", nullable: true, comment: "向量化错误信息" })
    error: string;

    /**
     * 使用的向量模型ID
     */
    @Column({
        type: "varchar",
        length: 100,
        nullable: true,
        comment: "使用的向量模型ID",
    })
    embeddingModelId: string;

    /**
     * 全文检索权重
     */
    @Column({ type: "float", nullable: true, comment: "全文检索权重" })
    fullTextWeight: number;

    /**
     * 关联的知识库
     */
    @ManyToOne(() => Datasets, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "dataset_id" })
    dataset?: Relation<Datasets>;

    /**
     * 关联的文档实体
     */
    @ManyToOne(() => DatasetsDocument, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "document_id" })
    document?: Relation<DatasetsDocument>;

    /**
     * 是否启用（1-启用，0-禁用）
     */
    @Column({ type: "int", default: 1, comment: "是否启用（1-启用，0-禁用）" })
    enabled: number = 1;
}
