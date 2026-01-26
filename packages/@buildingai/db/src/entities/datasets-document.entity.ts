import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, JoinColumn, ManyToOne, OneToMany, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";
import { DatasetsSegments } from "./datasets-segments.entity";

/**
 * 文档实体
 */
@AppEntity({ name: "datasets_documents", comment: "知识库文档" })
export class DatasetsDocument extends BaseEntity {
    /**
     * 知识库ID
     */
    @Column({ type: "uuid", comment: "知识库ID" })
    datasetId: string;

    /**
     * 上传文件ID
     */
    @Column({ type: "uuid", comment: "上传文件ID" })
    fileId: string;

    /**
     * 文件名
     */
    @Column({ length: 255, comment: "文件名" })
    fileName: string;

    /**
     * 文件类型
     */
    @Column({ length: 100, comment: "文件类型" })
    fileType: string;

    /**
     * 文件大小（字节）
     */
    @Column({ type: "bigint", comment: "文件大小" })
    fileSize: number;

    /**
     * 分段数量
     */
    @Column({ type: "int", default: 0, comment: "分段数量" })
    chunkCount: number;

    /**
     * 字符数量（所有分段的字符总数）
     */
    @Column({ type: "bigint", default: 0, comment: "字符数量" })
    characterCount: number;

    /**
     * 文档状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "pending",
        comment: "文档状态",
    })
    status: string;

    /**
     * 文档进度
     */
    @Column({ type: "int", default: 0, comment: "文档进度(0-100)" })
    progress: number;

    /**
     * 向量化错误信息
     */
    @Column({ type: "text", nullable: true, comment: "向量化错误信息" })
    error: string | null;

    /**
     * Embedding 模型ID
     */
    @Column({ type: "uuid", nullable: true, comment: "Embedding模型ID" })
    embeddingModelId?: string;

    /**
     * 是否启用
     */
    @Column({ type: "boolean", default: true, comment: "是否启用" })
    enabled: boolean;

    /**
     * 创建者ID
     */
    @Column({ type: "uuid", comment: "创建者ID", name: "created_by" })
    createdBy: string;

    /**
     * 关联的知识库
     */
    @ManyToOne(() => Datasets, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "dataset_id" })
    dataset?: Relation<Datasets>;

    /**
     * 文档下的分段列表
     */
    @OneToMany(() => DatasetsSegments, (segment) => segment.document)
    segments?: Relation<DatasetsSegments[]>;
}
