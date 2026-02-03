import { BaseService } from "@buildingai/base";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets, DatasetsDocument } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { llmFileParser } from "@buildingai/llm-file-parser";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";
import { pathExists, readFile } from "fs-extra";

import type { CreateDocumentDto, ListDocumentsDto } from "../dto/document.dto";
import { DatasetsSegmentService } from "./datasets-segment.service";
import { DocumentSummaryService } from "./document-summary.service";
import { SegmentationService } from "./segmentation.service";
import { VectorizationTriggerService } from "./vectorization-trigger.service";

@Injectable()
export class DatasetsDocumentService extends BaseService<DatasetsDocument> {
    protected readonly logger = new Logger(DatasetsDocumentService.name);

    constructor(
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        private readonly uploadService: UploadService,
        private readonly segmentationService: SegmentationService,
        private readonly segmentService: DatasetsSegmentService,
        private readonly vectorizationTrigger: VectorizationTriggerService,
        private readonly documentSummaryService: DocumentSummaryService,
    ) {
        super(documentRepository);
    }

    async createDocument(
        datasetId: string,
        dto: CreateDocumentDto,
        user: UserPlayground,
    ): Promise<DatasetsDocument> {
        const hasFileId = dto.fileId != null && String(dto.fileId).trim() !== "";
        const hasUrl = dto.url != null && String(dto.url).trim() !== "";
        if (hasFileId && hasUrl) {
            throw HttpErrorFactory.badRequest("只能传 fileId 或 url 其中之一");
        }
        if (!hasFileId && !hasUrl) {
            throw HttpErrorFactory.badRequest("必须传 fileId 或 url 其中之一");
        }
        if (hasFileId) {
            return this.createByFileId(datasetId, dto.fileId!.trim(), user);
        }
        return this.createByUrl(datasetId, dto.url!.trim(), user);
    }

    async createByFileId(
        datasetId: string,
        fileId: string,
        user: UserPlayground,
    ): Promise<DatasetsDocument> {
        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
        });
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");

        const file = await this.uploadService.getFileById(fileId);
        if (!file) throw HttpErrorFactory.notFound("文件不存在");

        const filePath = await this.uploadService.getFilePath(fileId);
        if (!(await pathExists(filePath))) {
            throw HttpErrorFactory.badRequest("文件已失效或已被删除");
        }

        const buffer = await readFile(filePath);
        const result = await llmFileParser.parseFromBuffer(
            buffer,
            file.originalName ?? "unknown",
            file.mimeType ?? undefined,
        );
        const rawText = result.text?.trim() ?? "";
        if (!rawText) {
            throw HttpErrorFactory.badRequest("文档解析后内容为空");
        }

        return this.createDocumentFromRawText(
            datasetId,
            {
                fileName: file.originalName ?? "unknown",
                fileType: file.mimeType ?? "application/octet-stream",
                fileSize: file.size ?? buffer.length,
                fileId,
                fileUrl: null,
            },
            rawText,
            dataset.embeddingModelId ?? undefined,
            user.id,
        );
    }

    async createByUrl(
        datasetId: string,
        url: string,
        user: UserPlayground,
    ): Promise<DatasetsDocument> {
        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
        });
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");

        const result = await llmFileParser.parseFromUrl(url.trim());
        const rawText = result.text?.trim() ?? "";
        if (!rawText) {
            throw HttpErrorFactory.badRequest("URL 文档解析后内容为空");
        }

        let fileName = result.metadata?.filename as string | undefined;
        if (!fileName) {
            try {
                fileName = new URL(url).pathname.split("/").pop() || "url-document";
            } catch {
                fileName = "url-document";
            }
        }
        const fileType = (result.metadata?.filetype as string) ?? "application/octet-stream";
        const fileSize = (result.metadata?.size as number) ?? rawText.length;

        return this.createDocumentFromRawText(
            datasetId,
            {
                fileName,
                fileType,
                fileSize,
                fileId: null,
                fileUrl: url.trim(),
            },
            rawText,
            dataset.embeddingModelId ?? undefined,
            user.id,
        );
    }

    private async createDocumentFromRawText(
        datasetId: string,
        meta: {
            fileName: string;
            fileType: string;
            fileSize: number;
            fileId: string | null;
            fileUrl: string | null;
        },
        rawText: string,
        embeddingModelId: string | undefined,
        createdBy: string,
    ): Promise<DatasetsDocument> {
        const segments = this.segmentationService.segment(rawText);
        if (segments.length === 0) {
            throw HttpErrorFactory.badRequest("分段后无有效内容");
        }

        const characterCount = segments.reduce((sum, s) => sum + s.length, 0);

        const insertResult = await this.documentRepository.insert({
            datasetId,
            fileId: meta.fileId,
            fileUrl: meta.fileUrl,
            fileName: meta.fileName,
            fileType: meta.fileType,
            fileSize: meta.fileSize,
            chunkCount: segments.length,
            characterCount,
            status: PROCESSING_STATUS.PENDING,
            progress: 0,
            error: null,
            embeddingModelId: embeddingModelId ?? null,
            enabled: true,
            createdBy: createdBy,
        } as any);
        const documentId = insertResult.identifiers[0]?.id as string;
        if (!documentId) {
            throw HttpErrorFactory.internal("Failed to create document");
        }

        await this.segmentService.createSegments(
            datasetId,
            documentId,
            segments.map((s) => ({ content: s.content, index: s.index, length: s.length })),
            embeddingModelId ?? null,
        );

        await this.updateDatasetCounts(datasetId, 1, segments.length, meta.fileSize);

        await this.vectorizationTrigger.triggerDocument(datasetId, documentId);
        this.logger.log(`Document created and vectorization triggered: ${documentId}`);

        this.documentSummaryService
            .generateAndSave(documentId, rawText)
            .catch((err) =>
                this.logger.warn(`Document summary skipped: ${documentId} - ${err?.message}`),
            );

        const doc = await this.documentRepository.findOne({
            where: { id: documentId },
        });
        if (!doc) throw HttpErrorFactory.internal("Document not found after create");
        return doc;
    }

    private async updateDatasetCounts(
        datasetId: string,
        documentDelta: number,
        chunkDelta: number,
        storageDelta: number,
    ): Promise<void> {
        await this.datasetsRepository
            .createQueryBuilder()
            .update(Datasets)
            .set({
                documentCount: () => `document_count + ${documentDelta}`,
                chunkCount: () => `chunk_count + ${chunkDelta}`,
                storageSize: () => `storage_size + ${storageDelta}`,
            })
            .where("id = :datasetId", { datasetId })
            .execute();
    }

    async listByDataset(datasetId: string, paginationDto: ListDocumentsDto | PaginationDto) {
        return this.paginate(paginationDto, {
            where: { datasetId },
            order: { createdAt: "DESC" },
        });
    }

    async getOne(datasetId: string, documentId: string): Promise<DatasetsDocument | null> {
        return this.documentRepository.findOne({
            where: { id: documentId, datasetId },
        });
    }

    async deleteDocument(datasetId: string, documentId: string): Promise<boolean> {
        const doc = await this.documentRepository.findOne({
            where: { id: documentId, datasetId },
        });
        if (!doc) return false;

        const segmentCount = doc.chunkCount ?? 0;
        const fileSize = doc.fileSize ?? 0;
        await this.documentRepository.remove(doc);
        await this.updateDatasetCounts(datasetId, -1, -segmentCount, -fileSize);
        this.logger.log(`Document deleted: ${documentId}`);
        return true;
    }

    async retryVectorization(datasetId: string, documentId: string): Promise<void> {
        const doc = await this.getOne(datasetId, documentId);
        if (!doc) throw HttpErrorFactory.notFound("文档不存在");

        const reset = await this.segmentService.resetFailedSegments(documentId);
        if (reset === 0) {
            throw HttpErrorFactory.badRequest("没有可重试的失败分段");
        }
        await this.documentRepository.update(documentId, {
            status: PROCESSING_STATUS.PENDING,
            progress: 0,
            error: null,
        });
        await this.vectorizationTrigger.triggerDocument(datasetId, documentId);
        this.logger.log(`Retry vectorization triggered for document: ${documentId}`);
    }
}
