import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsSegments } from "@buildingai/db/entities";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { DataSource, In, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

import { EmbeddingResult, VectorizationProgress } from "../interfaces/vectorization.interface";

/**
 * State service - Manage vectorization state and progress
 *
 * Responsibilities:
 * - Manage document and segment status transitions
 * - Calculate and sync progress to database
 * - Transaction-safe status updates
 * - Real-time progress tracking
 */
@Injectable()
export class StateService {
    private readonly logger = new Logger(StateService.name);

    constructor(
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Initialize vectorization for a document
     */
    async initializeDocumentVectorization(documentId: string): Promise<void> {
        await this.documentRepository.update(documentId, {
            status: PROCESSING_STATUS.PROCESSING,
            progress: 0,
            error: null,
        });

        this.logger.log(`Document vectorization initialized: ${documentId}`);
    }

    /**
     * Initialize vectorization for a dataset (all documents)
     */
    async initializeDatasetVectorization(datasetId: string): Promise<void> {
        const documents = await this.documentRepository.find({
            where: { datasetId },
            select: ["id"],
        });

        if (documents.length === 0) {
            this.logger.warn(`No documents found for dataset: ${datasetId}`);
            return;
        }

        await this.documentRepository.update(
            { datasetId },
            {
                status: PROCESSING_STATUS.PROCESSING,
                progress: 0,
                error: null,
            },
        );

        this.logger.log(
            `Dataset vectorization initialized: ${datasetId} (${documents.length} documents)`,
        );
    }

    /**
     * Mark segments as processing
     */
    async markSegmentsAsProcessing(segmentIds: string[]): Promise<void> {
        if (segmentIds.length === 0) return;

        await this.segmentsRepository.update(
            { id: In(segmentIds) },
            { status: PROCESSING_STATUS.PROCESSING },
        );

        this.logger.debug(`Marked ${segmentIds.length} segments as processing`);
    }

    /**
     * Save embedding results (transaction-safe)
     */
    async saveEmbeddingResults(results: EmbeddingResult[]): Promise<void> {
        if (results.length === 0) return;

        await this.dataSource.transaction(async (manager) => {
            // Group results by success/failure
            const successResults = results.filter((r) => r.success);
            const failedResults = results.filter((r) => !r.success);

            // Update successful embeddings
            if (successResults.length > 0) {
                for (const result of successResults) {
                    await manager.update(DatasetsSegments, result.segmentId, {
                        embedding: result.embedding,
                        vectorDimension: result.dimension,
                        embeddingModelId: result.modelId,
                        status: PROCESSING_STATUS.COMPLETED,
                        error: null,
                    });
                }

                this.logger.log(`Saved ${successResults.length} successful embeddings`);
            }

            // Update failed segments
            if (failedResults.length > 0) {
                for (const result of failedResults) {
                    await manager.update(DatasetsSegments, result.segmentId, {
                        status: PROCESSING_STATUS.FAILED,
                        error: result.error || "Unknown error",
                    });
                }

                this.logger.warn(`Marked ${failedResults.length} segments as failed`);
            }

            // Sync document status for affected documents
            const documentIds = await this.getDocumentIdsFromSegments(
                results.map((r) => r.segmentId),
            );

            for (const documentId of documentIds) {
                await this.syncDocumentStatusInTransaction(documentId, manager);
            }
        });
    }

    /**
     * Sync document status based on segment states
     */
    async syncDocumentStatus(documentId: string): Promise<void> {
        const segments = await this.segmentsRepository.find({
            where: { documentId },
            select: ["id", "status"],
        });

        if (segments.length === 0) {
            this.logger.warn(`No segments found for document: ${documentId}`);
            return;
        }

        const stats = this.calculateStats(segments);
        const { status, progress } = this.determineDocumentStatus(stats);

        await this.documentRepository.update(documentId, { status, progress });

        this.logger.log(`Document status synced: ${documentId} -> ${status} (${progress}%)`);
    }

    /**
     * Update document progress in real-time
     */
    async updateDocumentProgress(documentId: string, percentage: number): Promise<void> {
        await this.documentRepository.update(documentId, {
            progress: Math.min(100, Math.max(0, Math.round(percentage))),
        });

        this.logger.debug(`Document progress updated: ${documentId} -> ${percentage}%`);
    }

    /**
     * Update multiple documents progress in real-time
     */
    async updateMultipleDocumentsProgress(
        documentIds: string[],
        percentage: number,
    ): Promise<void> {
        if (documentIds.length === 0) return;

        const progress = Math.min(100, Math.max(0, Math.round(percentage)));

        await this.documentRepository.update({ id: In(documentIds) }, { progress });

        this.logger.debug(
            `Multiple documents progress updated: ${documentIds.length} docs -> ${percentage}%`,
        );
    }

    /**
     * Mark document as completed
     */
    async markDocumentCompleted(documentId: string): Promise<void> {
        await this.documentRepository.update(documentId, {
            status: PROCESSING_STATUS.COMPLETED,
            progress: 100,
        });
        this.logger.log(`Document marked as completed: ${documentId}`);
    }

    /**
     * Mark document as failed
     */
    async markDocumentFailed(documentId: string, error: string): Promise<void> {
        await this.documentRepository.update(documentId, {
            status: PROCESSING_STATUS.FAILED,
            error,
        });

        this.logger.error(`Document marked as failed: ${documentId} - ${error}`);
    }

    /**
     * Mark segments as failed
     */
    async markSegmentsFailed(segmentIds: string[], error: string): Promise<void> {
        if (segmentIds.length === 0) return;

        await this.segmentsRepository.update(
            { id: In(segmentIds) },
            {
                status: PROCESSING_STATUS.FAILED,
                error,
            },
        );

        this.logger.warn(`Marked ${segmentIds.length} segments as failed: ${error}`);
    }

    /**
     * Get vectorization progress for a document
     */
    async getDocumentProgress(documentId: string): Promise<VectorizationProgress> {
        const segments = await this.segmentsRepository.find({
            where: { documentId },
            select: ["id", "status"],
        });

        const stats = this.calculateStats(segments);

        return {
            total: stats.total,
            processed: stats.completed + stats.failed,
            success: stats.completed,
            failed: stats.failed,
            percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            status: this.determineDocumentStatus(stats).status,
        };
    }

    /**
     * Reset failed segments for retry
     */
    async resetFailedSegments(documentId?: string, datasetId?: string): Promise<number> {
        const where: any = {
            status: PROCESSING_STATUS.FAILED,
        };

        if (documentId) {
            where.documentId = documentId;
        } else if (datasetId) {
            where.datasetId = datasetId;
        }

        const result = await this.segmentsRepository.update(where, {
            status: PROCESSING_STATUS.PENDING,
            error: null,
        });

        const count = result.affected || 0;
        this.logger.log(`Reset ${count} failed segments for retry`);

        return count;
    }

    /**
     * Sync document status within a transaction
     */
    private async syncDocumentStatusInTransaction(documentId: string, manager: any): Promise<void> {
        const segments = await manager.find(DatasetsSegments, {
            where: { documentId },
            select: ["id", "status"],
        });

        if (segments.length === 0) return;

        const stats = this.calculateStats(segments);
        const { status, progress } = this.determineDocumentStatus(stats);

        await manager.update(DatasetsDocument, documentId, { status, progress });
    }

    /**
     * Calculate statistics from segments/documents
     */
    private calculateStats(items: Array<{ status: string }>): {
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
     * Determine document status based on segment statistics
     */
    private determineDocumentStatus(stats: {
        total: number;
        completed: number;
        failed: number;
        pending: number;
        processing: number;
    }): { status: string; progress: number } {
        const { total, completed, failed, pending, processing } = stats;

        if (total === 0) {
            return { status: PROCESSING_STATUS.PENDING, progress: 0 };
        }

        // Still has pending or processing
        if (pending > 0 || processing > 0) {
            return {
                status: PROCESSING_STATUS.PROCESSING,
                progress: Math.round((completed / total) * 100),
            };
        }

        // All failed
        if (failed === total) {
            return { status: PROCESSING_STATUS.FAILED, progress: 0 };
        }

        // Partial failure
        if (failed > 0 && completed > 0) {
            return {
                status: PROCESSING_STATUS.ERROR,
                progress: Math.round((completed / total) * 100),
            };
        }

        // All completed
        return { status: PROCESSING_STATUS.COMPLETED, progress: 100 };
    }

    /**
     * Get document IDs from segment IDs
     */
    private async getDocumentIdsFromSegments(segmentIds: string[]): Promise<string[]> {
        const segments = await this.segmentsRepository.find({
            where: { id: In(segmentIds) },
            select: ["documentId"],
        });

        return [...new Set(segments.map((s) => s.documentId))];
    }
}
