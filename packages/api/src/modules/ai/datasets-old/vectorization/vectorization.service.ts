import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsSegments } from "@buildingai/db/entities";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

import { VECTORIZATION_CONFIG } from "../constants/vectorization.constants";
import { ProgressCallback, VectorizationResult } from "../interfaces/vectorization.interface";
import { GeneratorService } from "./generator.service";
import { ModelAdapterService } from "./model-adapter.service";
import { StateService } from "./state.service";

/**
 * Vectorization service - Main coordinator for vectorization workflow
 *
 * Responsibilities:
 * - Coordinate the entire vectorization process
 * - Orchestrate generator, state, and model adapter services
 * - Handle high-level business logic
 * - Provide clean interface for queue processors
 *
 * This is the main entry point for all vectorization operations.
 */
@Injectable()
export class VectorizationService {
    private readonly logger = new Logger(VectorizationService.name);

    constructor(
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        private readonly modelAdapter: ModelAdapterService,
        private readonly generator: GeneratorService,
        private readonly state: StateService,
    ) {}

    /**
     * Execute document vectorization with real-time progress updates
     */
    async vectorizeDocument(
        documentId: string,
        progressCallback?: ProgressCallback,
    ): Promise<VectorizationResult> {
        const startTime = Date.now();

        this.logger.log(`Starting document vectorization: ${documentId}`);

        try {
            // 1. Load document and validate
            const document = await this.loadDocument(documentId);

            // 2. Initialize state
            await this.state.initializeDocumentVectorization(documentId);

            // 3. Get model configuration
            const modelConfig = await this.modelAdapter.getModelConfig(
                document.datasetId,
                document.embeddingModelId,
            );

            // 4. Load pending segments
            const segments = await this.loadPendingSegments(document.datasetId, documentId);

            if (segments.length === 0) {
                this.logger.log(`No pending segments for document: ${documentId}`);
                await this.state.markDocumentCompleted(documentId);

                return {
                    success: true,
                    type: "document",
                    entityId: documentId,
                    totalSegments: 0,
                    successCount: 0,
                    failureCount: 0,
                    processingTime: Date.now() - startTime,
                    finalStatus: PROCESSING_STATUS.COMPLETED,
                };
            }

            this.logger.log(`Processing ${segments.length} segments for document ${documentId}`);

            // 5. Mark segments as processing
            await this.state.markSegmentsAsProcessing(segments.map((s) => s.id));

            // 6. Create enhanced progress callback that updates both job and database
            const enhancedProgressCallback = async (
                processed: number,
                total: number,
                percentage: number,
            ) => {
                // Update database progress in real-time
                await this.state.updateDocumentProgress(documentId, percentage);

                // Call external progress callback if provided (for job progress)
                if (progressCallback) {
                    await progressCallback(processed, total, percentage);
                }
            };

            // 7. Execute vectorization with enhanced progress callback
            const embeddingResponse = await this.generator.batchEmbed({
                segments,
                modelConfig,
                batchSize: VECTORIZATION_CONFIG.DEFAULT_BATCH_SIZE,
                onProgress: enhancedProgressCallback,
            });

            // 8. Save results
            await this.state.saveEmbeddingResults(embeddingResponse.results);

            // 9. Sync document status (final sync)
            await this.state.syncDocumentStatus(documentId);

            const processingTime = Date.now() - startTime;

            // 10. Determine final status
            const progress = await this.state.getDocumentProgress(documentId);
            const finalStatus = progress.status;

            this.logger.log(
                `Document vectorization completed: ${documentId} - ${embeddingResponse.successCount}/${segments.length} success in ${processingTime}ms`,
            );

            return {
                success: embeddingResponse.failureCount === 0,
                type: "document",
                entityId: documentId,
                totalSegments: segments.length,
                successCount: embeddingResponse.successCount,
                failureCount: embeddingResponse.failureCount,
                processingTime,
                finalStatus,
                errors: embeddingResponse.errors,
            };
        } catch (error) {
            this.logger.error(
                `Document vectorization failed: ${documentId} - ${error.message}`,
                error.stack,
            );

            // Mark as failed
            await this.state.markDocumentFailed(documentId, error.message);

            return {
                success: false,
                type: "document",
                entityId: documentId,
                totalSegments: 0,
                successCount: 0,
                failureCount: 0,
                processingTime: Date.now() - startTime,
                finalStatus: PROCESSING_STATUS.FAILED,
                error: error.message,
            };
        }
    }

    /**
     * Execute dataset vectorization with real-time progress updates
     */
    async vectorizeDataset(
        datasetId: string,
        progressCallback?: ProgressCallback,
    ): Promise<VectorizationResult> {
        const startTime = Date.now();

        this.logger.log(`Starting dataset vectorization: ${datasetId}`);

        try {
            // 1. Load dataset and validate
            const dataset = await this.loadDataset(datasetId);

            // 2. Initialize state
            await this.state.initializeDatasetVectorization(datasetId);

            // 3. Get model configuration
            const modelConfig = await this.modelAdapter.getModelConfig(
                datasetId,
                dataset.embeddingModelId,
            );

            // 4. Load pending segments
            const segments = await this.loadPendingSegments(datasetId);

            if (segments.length === 0) {
                this.logger.log(`No pending segments for dataset: ${datasetId}`);

                return {
                    success: true,
                    type: "dataset",
                    entityId: datasetId,
                    totalSegments: 0,
                    successCount: 0,
                    failureCount: 0,
                    processingTime: Date.now() - startTime,
                    finalStatus: PROCESSING_STATUS.COMPLETED,
                };
            }

            this.logger.log(`Processing ${segments.length} segments for dataset ${datasetId}`);

            // 5. Mark segments as processing
            await this.state.markSegmentsAsProcessing(segments.map((s) => s.id));

            // 6. Create enhanced progress callback for dataset
            // For dataset, we update all documents' progress proportionally
            const documentIds = [...new Set(segments.map((s) => s.documentId))];
            const enhancedProgressCallback = async (
                processed: number,
                total: number,
                percentage: number,
            ) => {
                // Update progress for all documents in dataset
                await this.state.updateMultipleDocumentsProgress(documentIds, percentage);

                // Call external progress callback if provided (for job progress)
                if (progressCallback) {
                    await progressCallback(processed, total, percentage);
                }
            };

            // 7. Execute vectorization with enhanced progress callback
            const embeddingResponse = await this.generator.batchEmbed({
                segments,
                modelConfig,
                batchSize: VECTORIZATION_CONFIG.DEFAULT_BATCH_SIZE,
                onProgress: enhancedProgressCallback,
            });

            // 8. Save results
            await this.state.saveEmbeddingResults(embeddingResponse.results);

            // 9. Sync all document statuses (final sync)
            for (const docId of documentIds) {
                await this.state.syncDocumentStatus(docId);
            }

            const processingTime = Date.now() - startTime;

            // 10. Determine final status from document statuses
            const documents = await this.documentRepository.find({
                where: { id: In(documentIds) },
                select: ["status"],
            });
            const allCompleted = documents.every((d) => d.status === PROCESSING_STATUS.COMPLETED);
            const anyFailed = documents.some((d) => d.status === PROCESSING_STATUS.FAILED);
            const finalStatus = allCompleted
                ? PROCESSING_STATUS.COMPLETED
                : anyFailed
                  ? PROCESSING_STATUS.ERROR
                  : PROCESSING_STATUS.PROCESSING;

            this.logger.log(
                `Dataset vectorization completed: ${datasetId} - ${embeddingResponse.successCount}/${segments.length} success in ${processingTime}ms`,
            );

            return {
                success: embeddingResponse.failureCount === 0,
                type: "dataset",
                entityId: datasetId,
                totalSegments: segments.length,
                successCount: embeddingResponse.successCount,
                failureCount: embeddingResponse.failureCount,
                processingTime,
                finalStatus,
                errors: embeddingResponse.errors,
            };
        } catch (error) {
            this.logger.error(
                `Dataset vectorization failed: ${datasetId} - ${error.message}`,
                error.stack,
            );

            return {
                success: false,
                type: "dataset",
                entityId: datasetId,
                totalSegments: 0,
                successCount: 0,
                failureCount: 0,
                processingTime: Date.now() - startTime,
                finalStatus: PROCESSING_STATUS.FAILED,
                error: error.message,
            };
        }
    }

    /**
     * Retry failed vectorization for a document
     */
    async retryDocument(
        documentId: string,
        progressCallback?: ProgressCallback,
    ): Promise<VectorizationResult> {
        this.logger.log(`Retrying document vectorization: ${documentId}`);

        // Reset failed segments
        const resetCount = await this.state.resetFailedSegments(documentId);

        if (resetCount === 0) {
            this.logger.log(`No failed segments to retry for document: ${documentId}`);
            return {
                success: true,
                type: "document",
                entityId: documentId,
                totalSegments: 0,
                successCount: 0,
                failureCount: 0,
                processingTime: 0,
                finalStatus: PROCESSING_STATUS.COMPLETED,
            };
        }

        // Execute normal vectorization with progress callback
        return this.vectorizeDocument(documentId, progressCallback);
    }

    /**
     * Retry failed vectorization for a dataset
     */
    async retryDataset(
        datasetId: string,
        progressCallback?: ProgressCallback,
    ): Promise<VectorizationResult> {
        this.logger.log(`Retrying dataset vectorization: ${datasetId}`);

        // Reset failed segments
        const resetCount = await this.state.resetFailedSegments(undefined, datasetId);

        if (resetCount === 0) {
            this.logger.log(`No failed segments to retry for dataset: ${datasetId}`);
            return {
                success: true,
                type: "dataset",
                entityId: datasetId,
                totalSegments: 0,
                successCount: 0,
                failureCount: 0,
                processingTime: 0,
                finalStatus: PROCESSING_STATUS.COMPLETED,
            };
        }

        // Execute normal vectorization with progress callback
        return this.vectorizeDataset(datasetId, progressCallback);
    }

    /**
     * Load and validate document
     */
    private async loadDocument(documentId: string): Promise<DatasetsDocument> {
        const document = await this.documentRepository.findOne({
            where: { id: documentId },
        });

        if (!document) {
            throw new Error(`Document not found: ${documentId}`);
        }

        return document;
    }

    /**
     * Load and validate dataset
     */
    private async loadDataset(datasetId: string): Promise<Datasets> {
        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
        });

        if (!dataset) {
            throw new Error(`Dataset not found: ${datasetId}`);
        }

        return dataset;
    }

    /**
     * Load pending segments for vectorization
     */
    private async loadPendingSegments(
        datasetId: string,
        documentId?: string,
    ): Promise<DatasetsSegments[]> {
        const where: any = {
            datasetId,
            status: PROCESSING_STATUS.PENDING,
        };

        if (documentId) {
            where.documentId = documentId;
        }

        return await this.segmentsRepository.find({
            where,
            order: { chunkIndex: "ASC" },
        });
    }
}
