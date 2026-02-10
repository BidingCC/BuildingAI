import { BaseService } from "@buildingai/base";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsSegments } from "@buildingai/db/entities";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import {
    FileSegmentResultDto,
    IndexingSegmentsDto,
    ParentSegmentDto,
    SegmentResultDto,
} from "../dto/indexing-segments.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";

import { CreateDocumentDto, QueryDocumentDto, RenameDocumentDto } from "../dto/documents.dto";
import { CreateDocumentResponseDto } from "../interfaces/documents.interface";
import { IndexingService } from "./indexing.service";
import { VectorizationTriggerService } from "./vectorization-trigger.service";

/**
 * Document management service
 *
 * Handles document CRUD operations, segmentation, and vectorization triggering.
 */
@Injectable()
export class DocumentsService extends BaseService<DatasetsDocument> {
    protected readonly logger = new Logger(DocumentsService.name);

    constructor(
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        private readonly indexingService: IndexingService,
        private readonly uploadService: UploadService,
        private readonly vectorizationTrigger: VectorizationTriggerService,
    ) {
        super(documentRepository);
    }

    async createDocument(
        dto: CreateDocumentDto,
        user: UserPlayground,
    ): Promise<CreateDocumentResponseDto> {
        const startTime = Date.now();

        const dataset = await this.datasetsRepository.findOne({
            where: { id: dto.datasetId },
        });

        if (!dataset) {
            throw HttpErrorFactory.notFound("Dataset not found");
        }

        const existingDocumentsCount = await this.documentRepository.count({
            where: { datasetId: dto.datasetId },
        });

        // Update embedding model if this is the first document
        if (existingDocumentsCount === 0 && dto.embeddingModelId) {
            await this.datasetsRepository.update(dto.datasetId, {
                embeddingModelId: dto.embeddingModelId,
            });
        }

        const { fileIds } = dto.indexingConfig;

        if (!fileIds?.length) {
            throw HttpErrorFactory.badRequest("Please upload files");
        }

        try {
            const segmentsResult = await this.indexingService.indexingSegments(
                dto.indexingConfig as IndexingSegmentsDto,
            );
            this.logger.log(
                `[+] Segmentation completed, total segments: ${segmentsResult.totalSegments}`,
            );

            const fileResults =
                segmentsResult.fileResults?.filter((fr) => fr.segments?.length) ?? [];

            const documentPromises = fileResults.map(async (fileResult) => {
                const document = await this.createDocumentAndChunks(
                    dataset,
                    fileResult,
                    user,
                    dto.documentName,
                );
                this.logger.log(`[+] Document created: ${fileResult.fileName}`);

                // Trigger vectorization in background (safe mode)
                await this.vectorizationTrigger.triggerDocumentSafely(dataset.id, document.id);

                return document;
            });

            const createdDocuments = await Promise.all(documentPromises);
            this.logger.log(`[+] All vectorization jobs started`);

            const processingTime = Date.now() - startTime;

            return {
                documents: createdDocuments,
                createdCount: createdDocuments.length,
                totalSegments: segmentsResult.totalSegments,
                processingTime,
            };
        } catch (error) {
            this.logger.error(`[!] Failed to create document: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal(`Failed to create document: ${error.message}`);
        }
    }

    private async createDocumentAndChunks(
        dataset: Datasets,
        fileResult: FileSegmentResultDto,
        user: UserPlayground,
        customDocumentName?: string,
    ): Promise<DatasetsDocument> {
        const file = await this.uploadService.getFileById(fileResult.fileId);
        if (!file) {
            throw HttpErrorFactory.badRequest(`File not found: ${fileResult.fileId}`);
        }

        const documentName = customDocumentName || fileResult.fileName;
        const totalCharacterCount = fileResult.segments.reduce(
            (total, segment) => total + segment.content.length,
            0,
        );

        const document = await this.documentRepository.save({
            datasetId: dataset.id,
            fileId: fileResult.fileId,
            fileName: documentName,
            fileType: file.extension?.toUpperCase() || "Unknown",
            fileSize: file.size,
            embeddingModelId: dataset.embeddingModelId,
            chunkCount: fileResult.segmentCount,
            characterCount: totalCharacterCount,
            status: PROCESSING_STATUS.PENDING,
            progress: 0,
            enabled: true,
            createdBy: user.id,
        });

        const isParentSegment = (
            seg: SegmentResultDto | ParentSegmentDto,
        ): seg is ParentSegmentDto => "children" in seg;

        const vectorChunks = fileResult.segments.map((segment) => ({
            datasetId: dataset.id,
            documentId: document.id,
            content: segment.content,
            chunkIndex: segment.index,
            contentLength: segment.length,
            children: isParentSegment(segment)
                ? segment.children.map((child) => child.content)
                : undefined,
            metadata: {},
            embeddingModelId: dataset.embeddingModelId,
            status: PROCESSING_STATUS.PENDING,
            createdBy: user.id,
        }));

        await this.segmentsRepository.save(vectorChunks);

        // Update dataset statistics
        await this.datasetsRepository.increment({ id: dataset.id }, "documentCount", 1);
        await this.datasetsRepository.increment(
            { id: dataset.id },
            "chunkCount",
            fileResult.segmentCount,
        );

        await this.datasetsRepository
            .createQueryBuilder()
            .update(Datasets)
            .set({ storageSize: () => `storage_size + ${file.size}` })
            .where("id = :id", { id: dataset.id })
            .execute();

        return document;
    }

    async list(dto: QueryDocumentDto): Promise<{
        needPolling: boolean;
        items: DatasetsDocument[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const queryBuilder = this.documentRepository.createQueryBuilder("document");

        if (dto.datasetId) {
            queryBuilder.andWhere("document.datasetId = :datasetId", {
                datasetId: dto.datasetId,
            });
        }

        if (dto.keyword) {
            queryBuilder.andWhere("document.fileName ILIKE :keyword", {
                keyword: `%${dto.keyword}%`,
            });
        }

        if (dto.status) {
            queryBuilder.andWhere("document.status = :status", { status: dto.status });
        }

        if (dto.fileType) {
            queryBuilder.andWhere("document.fileType = :fileType", { fileType: dto.fileType });
        }

        if (dto.startTime && dto.endTime) {
            queryBuilder.andWhere("document.createdAt BETWEEN :startTime AND :endTime", {
                startTime: dto.startTime,
                endTime: dto.endTime,
            });
        }

        if (dto.fileIds?.length) {
            queryBuilder.andWhere("document.fileId IN (:...fileIds)", { fileIds: dto.fileIds });
        }

        queryBuilder.orderBy("document.createdAt", "DESC");

        const result = await this.paginateQueryBuilder(queryBuilder, dto);

        const needPolling = result.items.some(
            (doc) =>
                doc.status === PROCESSING_STATUS.PROCESSING ||
                doc.status === PROCESSING_STATUS.PENDING,
        );

        return { ...result, needPolling };
    }

    async getAllDocuments(datasetId?: string): Promise<DatasetsDocument[]> {
        return await this.documentRepository.find({
            where: { datasetId },
            order: { createdAt: "DESC" },
        });
    }

    async deleteDocument(id: string): Promise<boolean> {
        const document = await this.getDocumentById(id);

        try {
            const segmentCount = await this.segmentsRepository.count({
                where: { documentId: id },
            });

            await this.segmentsRepository.delete({ documentId: id });
            await this.documentRepository.delete(id);

            await this.datasetsRepository.decrement({ id: document.datasetId }, "documentCount", 1);
            await this.datasetsRepository.decrement(
                { id: document.datasetId },
                "chunkCount",
                segmentCount,
            );

            await this.datasetsRepository
                .createQueryBuilder()
                .update(Datasets)
                .set({ storageSize: () => `GREATEST(storage_size - ${document.fileSize}, 0)` })
                .where("id = :id", { id: document.datasetId })
                .execute();

            this.logger.log(
                `Document deleted: ${id}, dataset: ${document.datasetId}, segments: ${segmentCount}, freed: ${document.fileSize} bytes`,
            );
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete document: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal(`Failed to delete document: ${error.message}`);
        }
    }

    async renameDocument(id: string, dto: RenameDocumentDto): Promise<DatasetsDocument> {
        await this.documentRepository.update(id, { fileName: dto.fileName });
        return this.findOneById(id) as Promise<DatasetsDocument>;
    }

    async getDocumentById(id: string): Promise<DatasetsDocument> {
        const document = await this.findOneById(id);

        if (!document) {
            throw HttpErrorFactory.notFound("Document not found");
        }

        return document as DatasetsDocument;
    }

    /**
     * Retry failed segments vectorization
     *
     * Resets failed segments to pending and triggers re-vectorization.
     * Returns success=false if no failed segments found.
     */
    async retryDocument(documentId: string): Promise<{ success: boolean }> {
        const document = await this.getDocumentById(documentId);

        // Reset failed segments to pending
        const updateResult = await this.segmentsRepository.update(
            { documentId, status: PROCESSING_STATUS.FAILED },
            { status: PROCESSING_STATUS.PENDING },
        );

        // If no failed segments, nothing to retry
        if (!updateResult.affected || updateResult.affected === 0) {
            return { success: false };
        }

        // Reset document status and progress
        await this.documentRepository.update(documentId, {
            status: PROCESSING_STATUS.PENDING,
            progress: 0,
        });

        // Trigger vectorization
        await this.vectorizationTrigger.triggerDocument(document.datasetId, documentId);

        this.logger.log(
            `Document retry triggered: ${documentId}, ${updateResult.affected} segments reset`,
        );
        return { success: true };
    }

    async setDocumentEnabled(id: string, enabled: boolean): Promise<{ success: boolean }> {
        const document = await this.getDocumentById(id);
        if (!document) throw HttpErrorFactory.notFound("Document not found");

        await this.documentRepository.update(id, { enabled });

        this.logger.log(`Document status updated: ${id} -> ${enabled ? "enabled" : "disabled"}`);
        return { success: true };
    }
}
