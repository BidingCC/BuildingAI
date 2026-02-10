import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument, DatasetsSegments } from "@buildingai/db/entities";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 知识库分段服务
 *
 * Segment 读写、按文档统计状态、同步 Document 进度与 status
 */
@Injectable()
export class DatasetsSegmentService {
    private readonly logger = new Logger(DatasetsSegmentService.name);

    constructor(
        @InjectRepository(DatasetsSegments)
        private readonly segmentRepository: Repository<DatasetsSegments>,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        private readonly dataSource: DataSource,
    ) {}

    /**
     * 按 documentId 统计各状态数量
     */
    async getStatsByDocument(documentId: string): Promise<{
        total: number;
        completed: number;
        failed: number;
        pending: number;
        processing: number;
    }> {
        const segments = await this.segmentRepository.find({
            where: { documentId },
            select: ["id", "status"],
        });
        return {
            total: segments.length,
            completed: segments.filter((s) => s.status === PROCESSING_STATUS.COMPLETED).length,
            failed: segments.filter((s) => s.status === PROCESSING_STATUS.FAILED).length,
            pending: segments.filter((s) => s.status === PROCESSING_STATUS.PENDING).length,
            processing: segments.filter((s) => s.status === PROCESSING_STATUS.PROCESSING).length,
        };
    }

    /**
     * 根据分段统计计算文档 status 与 progress
     */
    getDocumentStatusFromStats(stats: {
        total: number;
        completed: number;
        failed: number;
        pending: number;
        processing: number;
    }): { status: string; progress: number } {
        const { total, completed, failed, pending, processing } = stats;
        if (total === 0) {
            return { status: PROCESSING_STATUS.COMPLETED, progress: 100 };
        }
        if (processing > 0 || (pending > 0 && completed + failed === 0)) {
            const progress = Math.round((completed / total) * 100);
            return { status: PROCESSING_STATUS.PROCESSING, progress };
        }
        if (failed === total) {
            return { status: PROCESSING_STATUS.FAILED, progress: 100 };
        }
        if (completed + failed === total) {
            return { status: PROCESSING_STATUS.COMPLETED, progress: 100 };
        }
        const progress = Math.round((completed / total) * 100);
        return { status: PROCESSING_STATUS.PROCESSING, progress };
    }

    /**
     * 同步单个文档的 status 与 progress
     */
    async syncDocumentProgress(documentId: string): Promise<void> {
        const stats = await this.getStatsByDocument(documentId);
        const { status, progress } = this.getDocumentStatusFromStats(stats);
        await this.documentRepository.update(documentId, { status, progress });
        this.logger.debug(`Document ${documentId} synced: ${status} (${progress}%)`);
    }

    /**
     * 获取待向量化的 segment 列表（pending）
     */
    async getPendingSegments(documentId: string, limit?: number): Promise<DatasetsSegments[]> {
        const qb = this.segmentRepository
            .createQueryBuilder("s")
            .where("s.document_id = :documentId", { documentId })
            .andWhere("s.status = :status", { status: PROCESSING_STATUS.PENDING })
            .orderBy("s.chunk_index", "ASC");
        if (limit != null) {
            qb.take(limit);
        }
        return qb.getMany();
    }

    /**
     * 批量保存 embedding 结果并同步文档进度
     */
    async saveEmbeddingResults(
        documentId: string,
        results: Array<{
            segmentId: string;
            success: boolean;
            embedding?: number[];
            dimension?: number;
            modelId?: string;
            error?: string;
        }>,
    ): Promise<void> {
        if (results.length === 0) return;

        await this.dataSource.transaction(async (manager) => {
            for (const r of results) {
                if (r.success && r.embedding != null) {
                    await manager.update(DatasetsSegments, r.segmentId, {
                        embedding: r.embedding,
                        vectorDimension: r.dimension ?? null,
                        embeddingModelId: r.modelId ?? null,
                        status: PROCESSING_STATUS.COMPLETED,
                        error: null,
                    });
                } else {
                    await manager.update(DatasetsSegments, r.segmentId, {
                        status: PROCESSING_STATUS.FAILED,
                        error: r.error ?? "Unknown error",
                    });
                }
            }
            const segments = await manager.find(DatasetsSegments, {
                where: { documentId },
                select: ["id", "status"],
            });
            const stats = this.calcStats(segments);
            const { status, progress } = this.getDocumentStatusFromStats(stats);
            await manager.update(DatasetsDocument, documentId, { status, progress });
        });
    }

    private calcStats(items: Array<{ status: string }>): {
        total: number;
        completed: number;
        failed: number;
        pending: number;
        processing: number;
    } {
        return {
            total: items.length,
            completed: items.filter((s) => s.status === PROCESSING_STATUS.COMPLETED).length,
            failed: items.filter((s) => s.status === PROCESSING_STATUS.FAILED).length,
            pending: items.filter((s) => s.status === PROCESSING_STATUS.PENDING).length,
            processing: items.filter((s) => s.status === PROCESSING_STATUS.PROCESSING).length,
        };
    }

    /**
     * 标记文档下所有 pending 的 segment 为 processing
     */
    async markPendingAsProcessing(documentId: string): Promise<number> {
        const result = await this.segmentRepository.update(
            { documentId, status: PROCESSING_STATUS.PENDING },
            { status: PROCESSING_STATUS.PROCESSING },
        );
        return result.affected ?? 0;
    }

    /**
     * 重置文档下 failed 的 segment 为 pending（用于重试）
     */
    async resetFailedSegments(documentId: string): Promise<number> {
        const result = await this.segmentRepository.update(
            { documentId, status: PROCESSING_STATUS.FAILED },
            { status: PROCESSING_STATUS.PENDING, error: null },
        );
        return result.affected ?? 0;
    }

    /**
     * 将文档下所有 segment 重置为待向量化（用于移动后重新向量化，清空原 embedding）
     */
    async resetAllSegmentsForReVectorization(documentId: string): Promise<number> {
        const result = await this.segmentRepository.update(
            { documentId },
            {
                status: PROCESSING_STATUS.PENDING,
                embedding: null as any,
                vectorDimension: null as any,
                embeddingModelId: null as any,
                error: null as any,
            },
        );
        return result.affected ?? 0;
    }

    /**
     * 创建分段记录（文档解析后调用）
     */
    async createSegments(
        datasetId: string,
        documentId: string,
        segments: Array<{ content: string; index: number; length: number }>,
        embeddingModelId: string | null,
    ): Promise<DatasetsSegments[]> {
        const entities = segments.map((s) =>
            this.segmentRepository.create({
                datasetId,
                documentId,
                content: s.content,
                chunkIndex: s.index,
                contentLength: s.length,
                metadata: {},
                status: PROCESSING_STATUS.PENDING,
                embeddingModelId: embeddingModelId ?? undefined,
                enabled: 1,
            }),
        );
        return this.segmentRepository.save(entities);
    }
}
