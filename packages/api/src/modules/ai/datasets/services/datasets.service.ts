import { BaseService } from "@buildingai/base";
import {
    DOCUMENT_MODE,
    PARENT_CONTEXT_MODE,
    PROCESSING_STATUS,
    RETRIEVAL_MODE,
} from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent } from "@buildingai/db/entities";
import { DatasetsSegments } from "@buildingai/db/entities";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { FileSegmentResultDto, IndexingSegmentsDto } from "@buildingai/dto/indexing-segments.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { RetrievalConfig } from "@buildingai/types/ai/retrieval-config.interface";
import { isEnabled } from "@buildingai/utils";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";

import { RAG_SERVICE_CONSTANTS } from "../constants/datasets-service.constants";
import { CreateDatasetDto, QueryDatasetDto, UpdateDatasetDto } from "../dto/datasets.dto";
import { DatasetMemberService } from "./datasets-member.service";
import { DocumentsService } from "./documents.service";
import { RetrievalConfigBuilder } from "./helpers/retrieval-config.builder";
import { SegmentMetadataBuilder } from "./helpers/segment-metadata.builder";
import { IndexingService } from "./indexing.service";
import { VectorizationTriggerService } from "./vectorization-trigger.service";

/**
 * Datasets service
 *
 * Handles dataset CRUD operations, configuration management, and file processing.
 */
@Injectable()
export class DatasetsService extends BaseService<Datasets> {
    protected readonly logger = new Logger(DatasetsService.name);

    constructor(
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        private readonly indexingService: IndexingService,
        private readonly uploadService: UploadService,
        private readonly datasetMemberService: DatasetMemberService,
        private readonly vectorizationTrigger: VectorizationTriggerService,
        private readonly documentsService: DocumentsService,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
    ) {
        super(datasetsRepository);
    }

    async createDatasets(dto: CreateDatasetDto, user: UserPlayground): Promise<Datasets> {
        const { name, indexingConfig } = dto;

        await this.validateDatasetCreation(name, user.id, indexingConfig);

        try {
            const dataset = await this.createDatasetRecord(dto, user);
            await this.initializeDatasetOwnerAndDocuments(dataset, indexingConfig, user);
            void this.processDatasetFilesAsync(dataset, indexingConfig, user);

            this.logger.log(`[+] Dataset created, processing in background: ${dataset.id}`);
            return dataset;
        } catch (err) {
            this.logger.error(`[!] Create failed: ${err.message}`, err.stack);
            throw HttpErrorFactory.internal(`Failed to create dataset: ${err.message}`);
        }
    }

    private async validateDatasetCreation(
        name: string,
        userId: string,
        indexingConfig: IndexingSegmentsDto,
    ): Promise<void> {
        const existing = await this.findOne({ where: { name, createdBy: userId } });
        if (existing) throw HttpErrorFactory.badRequest("Dataset name already exists");
        if (!indexingConfig.fileIds?.length)
            throw HttpErrorFactory.badRequest("Please upload files");
    }

    private async createDatasetRecord(
        dto: CreateDatasetDto,
        user: UserPlayground,
    ): Promise<Datasets> {
        const { name, description, embeddingModelId, retrievalConfig, indexingConfig } = dto;

        // Use builder to construct retrieval config
        const config = RetrievalConfigBuilder.build(retrievalConfig);

        const created = await this.create({
            name,
            description,
            indexingConfig,
            embeddingModelId,
            retrievalMode: retrievalConfig.retrievalMode,
            retrievalConfig: config,
            createdBy: user.id,
        });

        return (await this.findOneById(created.id!)) as Datasets;
    }

    private async initializeDatasetOwnerAndDocuments(
        dataset: Datasets,
        indexingConfig: IndexingSegmentsDto,
        user: UserPlayground,
    ): Promise<void> {
        await this.datasetMemberService.initializeOwner(dataset.id, user.id);
        this.logger.log(`[+] Owner initialized: ${user.id}`);

        this.logger.log(`[+] Creating document records: ${dataset.id}`);
        await this.createDocumentsSync(dataset, indexingConfig, user);
    }

    async createEmptyDataset(
        dto: { name: string; description?: string; embeddingModelId: string },
        user: UserPlayground,
    ): Promise<Datasets> {
        const { name, description, embeddingModelId } = dto;

        const existing = await this.findOne({ where: { name, createdBy: user.id } });
        if (existing) throw HttpErrorFactory.badRequest("Dataset name already exists");

        const indexingConfig: IndexingSegmentsDto = {
            documentMode: DOCUMENT_MODE.NORMAL,
            parentContextMode: PARENT_CONTEXT_MODE.PARAGRAPH,
            segmentation: {
                segmentIdentifier: "\\n\\n",
                maxSegmentLength: 1024,
                segmentOverlap: 50,
            },
            subSegmentation: {
                segmentIdentifier: "\\n",
                maxSegmentLength: 512,
            },
            preprocessingRules: {
                replaceConsecutiveWhitespace: false,
                removeUrlsAndEmails: false,
            },
            fileIds: [],
        };

        const retrievalConfig: RetrievalConfig = {
            retrievalMode: RETRIEVAL_MODE.HYBRID,
            strategy: "weighted_score",
            topK: RAG_SERVICE_CONSTANTS.DEFAULT_TOP_K,
            scoreThreshold: RAG_SERVICE_CONSTANTS.DEFAULT_SCORE_THRESHOLD,
            scoreThresholdEnabled: false,
            weightConfig: {
                semanticWeight: RAG_SERVICE_CONSTANTS.DEFAULT_SEMANTIC_WEIGHT,
                keywordWeight: RAG_SERVICE_CONSTANTS.DEFAULT_KEYWORD_WEIGHT,
            },
            rerankConfig: {
                enabled: false,
                modelId: "",
            },
        };

        const created = await this.create({
            name,
            description,
            createdBy: user.id,
            embeddingModelId,
            indexingConfig,
            retrievalConfig,
        });
        const dataset = (await this.findOneById(created.id!)) as Datasets;
        await this.datasetMemberService.initializeOwner(dataset.id, user.id);
        this.logger.log(`[+] Empty dataset created: ${user.id}`);
        return dataset;
    }

    async updateDataset(id: string, userId: string, dto: UpdateDatasetDto): Promise<Datasets> {
        const dataset = await this.findOneById(id);
        if (!dataset) throw HttpErrorFactory.notFound("Dataset not found");

        await this.validateDatasetNameUpdate(id, userId, dto.name, dataset.name);

        try {
            const updateData: Partial<Datasets> = this.buildBasicUpdateData(dto);

            if (dto.embeddingModelId && dto.embeddingModelId !== dataset.embeddingModelId) {
                await this.handleEmbeddingModelChange(id, dto.embeddingModelId, updateData);
            }

            if (dto.retrievalConfig !== undefined) {
                this.handleRetrievalConfigUpdate(dto.retrievalConfig, updateData);
            }

            await this.datasetsRepository.update(id, updateData);
            this.logger.log(`[+] Dataset updated: ${id}`);
            return (await this.findOneById(id)) as Datasets;
        } catch (err) {
            this.logger.error(`[!] Update failed: ${err.message}`, err.stack);
            throw HttpErrorFactory.internal(`Failed to update dataset: ${err.message}`);
        }
    }

    private async validateDatasetNameUpdate(
        id: string,
        userId: string,
        newName: string | undefined,
        currentName: string,
    ): Promise<void> {
        if (newName && newName !== currentName) {
            const duplicate = await this.findOne({ where: { name: newName, createdBy: userId } });
            if (duplicate && duplicate.id !== id) {
                throw HttpErrorFactory.badRequest("Dataset name already exists");
            }
        }
    }

    private buildBasicUpdateData(dto: UpdateDatasetDto): Partial<Datasets> {
        return {
            name: dto.name || undefined,
            description: dto.description || undefined,
        };
    }

    private async handleEmbeddingModelChange(
        id: string,
        newModelId: string,
        updateData: Partial<Datasets>,
    ): Promise<void> {
        this.logger.log(`[!] Embedding model changed, checking re-vectorization: ${id}`);

        const segmentCount = await this.segmentsRepository.count({ where: { datasetId: id } });

        if (segmentCount > 0) {
            await this.resetSegmentsForRevectorization(id, newModelId);
            await this.resetDocumentsForRevectorization(id, newModelId);
            updateData.embeddingModelId = newModelId;

            // Trigger re-vectorization (safe mode)
            await this.vectorizationTrigger.triggerDatasetSafely(id);

            this.logger.log(`[!] Re-vectorization triggered, all status updated`);
        } else {
            this.logger.log(`[!] No segments, updating model ID only`);
            updateData.embeddingModelId = newModelId;
            await this.documentRepository.update(
                { datasetId: id },
                { embeddingModelId: newModelId },
            );
        }
    }

    private async resetSegmentsForRevectorization(
        datasetId: string,
        newModelId: string,
    ): Promise<void> {
        await this.segmentsRepository.update(
            { datasetId },
            {
                status: PROCESSING_STATUS.PENDING,
                embedding: null,
                embeddingModelId: newModelId,
            },
        );
        this.logger.log(`[!] Segments reset to pending`);
    }

    private async resetDocumentsForRevectorization(
        datasetId: string,
        newModelId: string,
    ): Promise<void> {
        await this.documentRepository.update(
            { datasetId },
            {
                embeddingModelId: newModelId,
                status: PROCESSING_STATUS.PROCESSING,
                progress: 0,
            },
        );
        this.logger.log(`[!] Documents reset to processing`);
    }

    private handleRetrievalConfigUpdate(
        retrievalConfig: RetrievalConfig,
        updateData: Partial<Datasets>,
    ): void {
        // Use builder to construct retrieval config
        const config = RetrievalConfigBuilder.build(retrievalConfig);
        updateData.retrievalMode = retrievalConfig.retrievalMode;
        updateData.retrievalConfig = config;
    }

    private async createDocumentsSync(
        dataset: Datasets,
        indexingConfig: IndexingSegmentsDto,
        user: UserPlayground,
    ): Promise<void> {
        const { fileIds } = indexingConfig;
        let totalSizeInBytes = 0;
        const documentsToCreate = [];

        for (const fileId of fileIds) {
            const file = await this.uploadService.getFileById(fileId);
            if (!file) {
                this.logger.warn(`[!] File not found: ${fileId}`);
                continue;
            }

            totalSizeInBytes += file.size;
            documentsToCreate.push({
                datasetId: dataset.id,
                fileId,
                fileName: file.originalName,
                fileType: file.extension?.toUpperCase() || "UNKNOWN",
                fileSize: file.size,
                embeddingModelId: dataset.embeddingModelId,
                chunkCount: 0,
                characterCount: 0,
                status: PROCESSING_STATUS.PENDING,
                progress: 0,
                enabled: true,
                createdBy: user.id,
            });
        }

        if (documentsToCreate.length > 0) {
            await this.documentRepository.save(documentsToCreate);

            await this.datasetsRepository
                .createQueryBuilder()
                .update(Datasets)
                .set({
                    documentCount: () => `document_count + ${documentsToCreate.length}`,
                    storageSize: () => `storage_size + ${totalSizeInBytes}`,
                })
                .where("id = :id", { id: dataset.id })
                .execute();
        }

        this.logger.log(
            `[+] Created ${documentsToCreate.length} documents, total size: ${totalSizeInBytes} bytes`,
        );
    }

    private async processDatasetFilesAsync(
        dataset: Datasets,
        indexingConfig: IndexingSegmentsDto,
        user: UserPlayground,
    ): Promise<void> {
        try {
            this.logger.log(`[+] Processing files async: ${dataset.id}`);

            if (!indexingConfig.fileIds?.length) {
                this.logger.log(`[+] No files in dataset: ${dataset.id}`);
                return;
            }

            const segmentsResult = await this.indexingService.indexingSegments(indexingConfig);

            if (
                segmentsResult?.fileResults &&
                Array.isArray(segmentsResult.fileResults) &&
                segmentsResult.fileResults.length > 0
            ) {
                await this.updateDocumentsAndChunks(dataset, segmentsResult.fileResults, user);

                // Trigger vectorization (safe mode)
                await this.vectorizationTrigger.triggerDatasetSafely(dataset.id);
                this.logger.log(`[+] Vectorization job added to queue`);
            } else {
                this.logger.log(`[+] File processing done but no valid segments: ${dataset.id}`);
            }
        } catch (err) {
            this.logger.error(`[!] Async processing failed: ${err.message}`, err.stack);

            try {
                await this.documentRepository.update(
                    {
                        datasetId: dataset.id,
                        fileId: In(indexingConfig.fileIds || []),
                    },
                    {
                        enabled: false,
                        progress: 0,
                        status: PROCESSING_STATUS.FAILED,
                        error: err.message?.toString() || "File processing failed",
                    },
                );
                this.logger.warn(`[!] Batch marked documents as failed, datasetId=${dataset.id}`);
            } catch (updateErr) {
                this.logger.error(
                    `[!] Batch update documents failed: ${updateErr.message}`,
                    updateErr.stack,
                );
            }
        }
    }

    private async updateDocumentsAndChunks(
        dataset: Datasets,
        fileResults: FileSegmentResultDto[],
        user: UserPlayground,
    ) {
        let totalChunkCount = 0;
        const allSegments = [];

        for (const file of fileResults) {
            const doc = await this.documentRepository.findOne({
                where: { datasetId: dataset.id, fileId: file.fileId },
            });
            if (!doc) {
                this.logger.warn(`[!] Document not found: ${file.fileId}`);
                continue;
            }

            const totalCharacterCount = file.segments.reduce(
                (total, segment) => total + segment.content.length,
                0,
            );

            await this.documentRepository.update(doc.id, {
                chunkCount: file.segmentCount,
                characterCount: totalCharacterCount,
            });

            // Build segment metadata using helper
            const segmentMetadata = await SegmentMetadataBuilder.build(doc, this.uploadService);

            const segments = file.segments.map((seg) => ({
                datasetId: dataset.id,
                documentId: doc.id,
                content: seg.content,
                chunkIndex: seg.index,
                contentLength: seg.length,
                children: "children" in seg ? seg.children.map((c) => c.content) : undefined,
                metadata: segmentMetadata,
                embeddingModelId: dataset.embeddingModelId,
                status: PROCESSING_STATUS.PENDING,
                createdBy: user.id,
            }));

            allSegments.push(...segments);
            totalChunkCount += file.segmentCount;

            this.logger.log(
                `[+] Document ${doc.fileName} processed: ${file.segmentCount} segments, ${totalCharacterCount} chars`,
            );
        }

        if (allSegments.length > 0) {
            await this.segmentsRepository.save(allSegments);
        }

        if (totalChunkCount > 0) {
            await this.datasetsRepository
                .createQueryBuilder()
                .update(Datasets)
                .set({
                    chunkCount: () => `chunk_count + ${totalChunkCount}`,
                })
                .where("id = :id", { id: dataset.id })
                .execute();
        }

        this.logger.log(`[+] Batch saved ${allSegments.length} segments`);
    }

    /**
     * Retry vectorization for all failed documents in dataset
     *
     * More efficient implementation: resets all failed segments at once
     * instead of looping through documents.
     */
    async retryDataset(datasetId: string): Promise<{ success: boolean }> {
        // Reset all failed segments in dataset to pending
        const updateResult = await this.segmentsRepository.update(
            { datasetId, status: PROCESSING_STATUS.FAILED },
            { status: PROCESSING_STATUS.PENDING },
        );

        // If no failed segments, nothing to retry
        if (!updateResult.affected || updateResult.affected === 0) {
            return { success: false };
        }

        // Reset all documents with failed segments
        await this.documentRepository.update(
            { datasetId, status: PROCESSING_STATUS.FAILED },
            { status: PROCESSING_STATUS.PENDING, progress: 0 },
        );

        // Also reset documents with error status (partial failure)
        await this.documentRepository.update(
            { datasetId, status: PROCESSING_STATUS.ERROR },
            { status: PROCESSING_STATUS.PENDING, progress: 0 },
        );

        // Trigger vectorization
        await this.vectorizationTrigger.triggerDataset(datasetId);

        this.logger.log(
            `Dataset retry triggered: ${datasetId}, ${updateResult.affected} segments reset`,
        );
        return { success: true };
    }

    async list(dto: QueryDatasetDto, user: UserPlayground) {
        const qb = this.datasetsRepository.createQueryBuilder("dataset");

        if (!isEnabled(user.isRoot)) {
            if (dto.showAll) {
                qb.where("dataset.createdBy = :userId", { userId: user.id });
            } else {
                const memberIds = await this.datasetMemberService.getUserMemberDatasetIds(user.id);
                if (memberIds.length > 0) {
                    qb.where("(dataset.createdBy = :userId OR dataset.id IN (:...memberIds))", {
                        userId: user.id,
                        memberIds,
                    });
                } else {
                    qb.where("dataset.createdBy = :userId", { userId: user.id });
                }
            }
        }

        if (dto.keyword) {
            qb.andWhere("(dataset.name ILIKE :kw OR dataset.description ILIKE :kw)", {
                kw: `%${dto.keyword}%`,
            });
        }

        if (dto.status) {
            qb.andWhere("dataset.status = :status", { status: dto.status });
        }

        if (dto.startTime && dto.endTime) {
            qb.andWhere("dataset.createdAt BETWEEN :startTime AND :endTime", {
                startTime: dto.startTime,
                endTime: dto.endTime,
            });
        }

        qb.orderBy("dataset.createdAt", "DESC");

        const result = await this.paginateQueryBuilder(qb, dto);

        this.logger.log(`Query result: total=${result.items.length}`);

        return result;
    }

    async deleteDataset(id: string): Promise<{ success: boolean }> {
        const dataset = await this.findOneById(id);
        if (!dataset) throw HttpErrorFactory.notFound("Dataset not found");

        try {
            const relatedAgentCount = await this.agentRepository
                .createQueryBuilder("agent")
                .where("CONCAT(',', agent.datasetIds, ',') LIKE :pattern", {
                    pattern: `%,${id},%`,
                })
                .getCount();
            if (relatedAgentCount > 0) {
                throw HttpErrorFactory.badRequest(
                    `This dataset is associated with ${relatedAgentCount} applications and cannot be deleted. Please remove it from related applications first`,
                );
            }
        } catch (err) {
            if (err?.status && err?.response) {
                throw err;
            }
            this.logger.error(`[!] Delete validation failed: ${err?.message || err}`);
            throw HttpErrorFactory.internal("Pre-deletion validation failed");
        }

        try {
            await this.datasetsRepository.manager.transaction(
                async (transactionalEntityManager) => {
                    await transactionalEntityManager.delete(DatasetsSegments, { datasetId: id });
                    this.logger.log(`[+] Deleted dataset segments: ${id}`);

                    await transactionalEntityManager.delete(DatasetsDocument, { datasetId: id });
                    this.logger.log(`[+] Deleted dataset documents: ${id}`);

                    await transactionalEntityManager.delete(Datasets, { id });
                    this.logger.log(`[+] Deleted dataset: ${id}`);
                },
            );

            return { success: true };
        } catch (err) {
            this.logger.error(`Delete failed: ${err.message}`, err.stack);
            throw HttpErrorFactory.internal(`Deletion failed: ${err.message}`);
        }
    }

    async getDatasetById(id: string, userId: string, user?: UserPlayground): Promise<Datasets> {
        const dataset = await this.findOneById(id);
        if (!dataset) throw HttpErrorFactory.notFound("Dataset not found");

        if (!isEnabled(user?.isRoot) && dataset.createdBy !== userId) {
            const isMember = await this.datasetMemberService.isDatasetMember(id, userId);
            if (!isMember)
                throw HttpErrorFactory.notFound("Dataset not found or no access permission");
        }

        try {
            const relatedAgentCount = await this.agentRepository
                .createQueryBuilder("agent")
                .where("CONCAT(',', agent.datasetIds, ',') LIKE :pattern", {
                    pattern: `%,${id},%`,
                })
                .getCount();
            (dataset as Datasets).relatedAgentCount = relatedAgentCount;
        } catch (err) {
            this.logger.warn(
                `[Dataset details] Count related agents failed: ${err?.message || err}`,
            );
        }

        return dataset as Datasets;
    }
}
