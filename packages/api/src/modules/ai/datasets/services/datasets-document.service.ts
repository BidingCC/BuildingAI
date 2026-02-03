import { BaseService } from "@buildingai/base";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets, DatasetsDocument, DatasetsSegments } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { llmFileParser } from "@buildingai/llm-file-parser";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";
import { pathExists, readFile } from "fs-extra";

import type {
    BatchAddTagsDto,
    BatchCopyDocumentsDto,
    BatchDeleteDocumentsDto,
    BatchMoveDocumentsDto,
    CreateDocumentDto,
    ListDocumentsDto,
} from "../dto/document.dto";
import { DatasetMemberService } from "./datasets-member.service";
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
        @InjectRepository(DatasetsSegments)
        private readonly segmentRepository: Repository<DatasetsSegments>,
        private readonly uploadService: UploadService,
        private readonly segmentationService: SegmentationService,
        private readonly segmentService: DatasetsSegmentService,
        private readonly vectorizationTrigger: VectorizationTriggerService,
        private readonly documentSummaryService: DocumentSummaryService,
        private readonly datasetMemberService: DatasetMemberService,
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

    async batchDeleteDocuments(
        datasetId: string,
        dto: BatchDeleteDocumentsDto,
    ): Promise<{ deleted: number }> {
        const docs = await this.documentRepository.find({
            where: { datasetId, id: In(dto.documentIds) },
            select: ["id", "chunkCount", "fileSize"],
        });
        if (docs.length === 0) {
            return { deleted: 0 };
        }
        let chunkDelta = 0;
        let storageDelta = 0;
        for (const doc of docs) {
            chunkDelta += doc.chunkCount ?? 0;
            storageDelta += doc.fileSize ?? 0;
            await this.documentRepository.remove(doc);
        }
        await this.updateDatasetCounts(datasetId, -docs.length, -chunkDelta, -storageDelta);
        this.logger.log(`Batch deleted ${docs.length} documents from dataset ${datasetId}`);
        return { deleted: docs.length };
    }

    async batchMoveDocuments(
        datasetId: string,
        dto: BatchMoveDocumentsDto,
        user: UserPlayground,
    ): Promise<{ moved: number }> {
        if (dto.targetDatasetId === datasetId) {
            throw HttpErrorFactory.badRequest("目标知识库不能与当前知识库相同");
        }
        await this.datasetMemberService.checkPermission(
            dto.targetDatasetId,
            user,
            "canManageDocuments",
        );
        const targetDataset = await this.datasetsRepository.findOne({
            where: { id: dto.targetDatasetId },
        });
        if (!targetDataset) throw HttpErrorFactory.notFound("目标知识库不存在");

        const docs = await this.documentRepository.find({
            where: { datasetId, id: In(dto.documentIds) },
            select: ["id", "chunkCount", "fileSize"],
        });
        if (docs.length === 0) {
            return { moved: 0 };
        }

        const documentIds = docs.map((d) => d.id);
        let sourceChunkDelta = 0;
        let sourceStorageDelta = 0;
        let targetChunkDelta = 0;
        let targetStorageDelta = 0;
        for (const doc of docs) {
            sourceChunkDelta += doc.chunkCount ?? 0;
            sourceStorageDelta += doc.fileSize ?? 0;
            targetChunkDelta += doc.chunkCount ?? 0;
            targetStorageDelta += doc.fileSize ?? 0;
        }

        await this.dataSource.transaction(async (manager) => {
            await manager.update(
                DatasetsDocument,
                { id: In(documentIds) },
                {
                    datasetId: dto.targetDatasetId,
                    embeddingModelId: targetDataset.embeddingModelId ?? null,
                    status: PROCESSING_STATUS.PENDING,
                    progress: 0,
                    error: null,
                },
            );
            await manager.update(
                DatasetsSegments,
                { documentId: In(documentIds) },
                { datasetId: dto.targetDatasetId },
            );
            await manager
                .createQueryBuilder()
                .update(Datasets)
                .set({
                    documentCount: () => `document_count - ${docs.length}`,
                    chunkCount: () => `chunk_count - ${sourceChunkDelta}`,
                    storageSize: () => `storage_size - ${sourceStorageDelta}`,
                })
                .where("id = :datasetId", { datasetId })
                .execute();
            await manager
                .createQueryBuilder()
                .update(Datasets)
                .set({
                    documentCount: () => `document_count + ${docs.length}`,
                    chunkCount: () => `chunk_count + ${targetChunkDelta}`,
                    storageSize: () => `storage_size + ${targetStorageDelta}`,
                })
                .where("id = :targetDatasetId", { targetDatasetId: dto.targetDatasetId })
                .execute();
        });

        for (const docId of documentIds) {
            await this.segmentService.resetAllSegmentsForReVectorization(docId);
            await this.vectorizationTrigger.triggerDocument(dto.targetDatasetId, docId);
        }
        this.logger.log(
            `Batch moved ${docs.length} documents from dataset ${datasetId} to ${dto.targetDatasetId}, re-vectorization triggered`,
        );
        return { moved: docs.length };
    }

    async batchCopyDocuments(
        datasetId: string,
        dto: BatchCopyDocumentsDto,
        user: UserPlayground,
    ): Promise<{ copied: number }> {
        if (dto.targetDatasetId === datasetId) {
            throw HttpErrorFactory.badRequest("目标知识库不能与当前知识库相同");
        }
        await this.datasetMemberService.checkPermission(
            dto.targetDatasetId,
            user,
            "canManageDocuments",
        );
        const targetDataset = await this.datasetsRepository.findOne({
            where: { id: dto.targetDatasetId },
        });
        if (!targetDataset) throw HttpErrorFactory.notFound("目标知识库不存在");

        const docs = await this.documentRepository.find({
            where: { datasetId, id: In(dto.documentIds) },
            select: [
                "id",
                "fileName",
                "fileType",
                "fileSize",
                "fileId",
                "fileUrl",
                "chunkCount",
                "characterCount",
                "tags",
            ],
        });
        if (docs.length === 0) {
            return { copied: 0 };
        }

        const docIds = docs.map((d) => d.id);
        const segments = await this.segmentRepository.find({
            where: { documentId: In(docIds) },
            select: ["documentId", "content", "chunkIndex", "contentLength"],
            order: { chunkIndex: "ASC" },
        });
        const segmentsByDoc = new Map<string, typeof segments>();
        for (const s of segments) {
            const list = segmentsByDoc.get(s.documentId) ?? [];
            list.push(s);
            segmentsByDoc.set(s.documentId, list);
        }

        const targetEmbeddingModelId = targetDataset.embeddingModelId ?? null;
        const oldToNewDocId = new Map<string, string>();

        const newDocIdToRawText = new Map<string, string>();
        let targetDocumentDelta = 0;
        let targetChunkDelta = 0;
        let targetStorageDelta = 0;

        await this.dataSource.transaction(async (manager) => {
            const docRepo = manager.getRepository(DatasetsDocument);
            const segRepo = manager.getRepository(DatasetsSegments);
            for (const doc of docs) {
                const docSegments = segmentsByDoc.get(doc.id) ?? [];
                const insertDoc = await docRepo.insert({
                    datasetId: dto.targetDatasetId,
                    fileId: doc.fileId,
                    fileUrl: doc.fileUrl,
                    fileName: doc.fileName,
                    fileType: doc.fileType,
                    fileSize: doc.fileSize,
                    chunkCount: doc.chunkCount,
                    characterCount: doc.characterCount,
                    status: PROCESSING_STATUS.PENDING,
                    progress: 0,
                    error: null,
                    embeddingModelId: targetEmbeddingModelId,
                    enabled: true,
                    createdBy: user.id,
                    tags: doc.tags ?? undefined,
                    summary: null,
                    summaryGenerating: false,
                } as any);
                const newDocId = insertDoc.identifiers[0]?.id as string;
                if (!newDocId) throw HttpErrorFactory.internal("Failed to create copied document");
                oldToNewDocId.set(doc.id, newDocId);
                const rawText = docSegments
                    .map((s) => s.content)
                    .join("\n\n")
                    .trim();
                if (rawText) newDocIdToRawText.set(newDocId, rawText);
                targetDocumentDelta += 1;
                targetChunkDelta += doc.chunkCount ?? 0;
                targetStorageDelta += doc.fileSize ?? 0;

                for (const seg of docSegments) {
                    await segRepo.insert({
                        datasetId: dto.targetDatasetId,
                        documentId: newDocId,
                        content: seg.content,
                        chunkIndex: seg.chunkIndex,
                        contentLength: seg.contentLength,
                        metadata: {},
                        status: PROCESSING_STATUS.PENDING,
                        embeddingModelId: targetEmbeddingModelId ?? undefined,
                        enabled: 1,
                    } as any);
                }
            }
            await manager
                .createQueryBuilder()
                .update(Datasets)
                .set({
                    documentCount: () => `document_count + ${targetDocumentDelta}`,
                    chunkCount: () => `chunk_count + ${targetChunkDelta}`,
                    storageSize: () => `storage_size + ${targetStorageDelta}`,
                })
                .where("id = :targetDatasetId", { targetDatasetId: dto.targetDatasetId })
                .execute();
        });

        for (const newDocId of oldToNewDocId.values()) {
            await this.vectorizationTrigger.triggerDocument(dto.targetDatasetId, newDocId);
        }
        for (const [newDocId, rawText] of newDocIdToRawText) {
            this.documentSummaryService
                .generateAndSave(newDocId, rawText)
                .catch((err) =>
                    this.logger.warn(
                        `Document summary skipped for copied doc ${newDocId}: ${err?.message}`,
                    ),
                );
        }
        this.logger.log(
            `Batch copied ${docs.length} documents from dataset ${datasetId} to ${dto.targetDatasetId}, vectorization and summary triggered`,
        );
        return { copied: docs.length };
    }

    async batchAddTags(datasetId: string, dto: BatchAddTagsDto): Promise<{ updated: number }> {
        const docs = await this.documentRepository.find({
            where: { datasetId, id: In(dto.documentIds) },
            select: ["id", "tags"],
        });
        if (docs.length === 0) {
            return { updated: 0 };
        }
        const normalizedNewTags = [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))];
        if (normalizedNewTags.length === 0) {
            throw HttpErrorFactory.badRequest("至少需要提供一个有效标签");
        }
        let updated = 0;
        for (const doc of docs) {
            const existing = doc.tags ?? [];
            const merged = [...new Set([...existing, ...normalizedNewTags])];
            if (merged.length !== existing.length) {
                await this.documentRepository.update(doc.id, { tags: merged });
                updated++;
            }
        }
        this.logger.log(`Batch add tags: ${updated} documents updated in dataset ${datasetId}`);
        return { updated };
    }

    async updateDocumentTags(
        datasetId: string,
        documentId: string,
        tags: string[],
    ): Promise<DatasetsDocument | null> {
        const doc = await this.documentRepository.findOne({
            where: { id: documentId, datasetId },
            select: ["id", "tags"],
        });
        if (!doc) return null;
        const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
        await this.documentRepository.update(documentId, { tags: normalized });
        return this.documentRepository.findOne({
            where: { id: documentId, datasetId },
        });
    }
}
