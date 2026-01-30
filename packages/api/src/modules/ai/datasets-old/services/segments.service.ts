import { BaseService } from "@buildingai/base";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsSegments } from "@buildingai/db/entities";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";

import { CreateSegmentDto, QuerySegmentDto, UpdateSegmentDto } from "../dto/segments.dto";
import { SegmentMetadataBuilder } from "./helpers/segment-metadata.builder";
import { VectorizationTriggerService } from "./vectorization-trigger.service";

/**
 * Segment management service
 *
 * Handles segment CRUD operations and triggers vectorization.
 */
@Injectable()
export class SegmentsService extends BaseService<DatasetsSegments> {
    protected readonly logger = new Logger(SegmentsService.name);

    constructor(
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        private readonly vectorizationTrigger: VectorizationTriggerService,
        private readonly uploadService: UploadService,
    ) {
        super(segmentsRepository);
    }

    async createSegment(dto: CreateSegmentDto): Promise<DatasetsSegments> {
        const document = await this.documentRepository.findOne({
            where: { id: dto.documentId, datasetId: dto.datasetId },
        });

        if (!document) {
            throw new Error("Document not found or not in dataset");
        }

        const segmentCount = await this.segmentsRepository.count({
            where: { documentId: dto.documentId },
        });

        // Build segment metadata using helper
        const mergedMetadata = await SegmentMetadataBuilder.buildWithCustom(
            document,
            this.uploadService,
            dto.metadata,
        );

        const segment = this.segmentsRepository.create({
            documentId: dto.documentId,
            datasetId: dto.datasetId,
            content: dto.content,
            chunkIndex: segmentCount,
            contentLength: dto.content.length,
            metadata: mergedMetadata,
            status: PROCESSING_STATUS.PENDING,
        });

        const savedSegment = await this.segmentsRepository.save(segment);

        await this.documentRepository.update(
            { id: dto.documentId },
            { chunkCount: segmentCount + 1 },
        );

        await this.documentRepository
            .createQueryBuilder()
            .update(DatasetsDocument)
            .set({ characterCount: () => `character_count + ${dto.content.length}` })
            .where("id = :id", { id: dto.documentId })
            .execute();

        await this.datasetsRepository.increment({ id: dto.datasetId }, "chunkCount", 1);

        // Trigger vectorization in background (safe mode)
        void this.vectorizationTrigger.triggerDocumentSafely(dto.datasetId, dto.documentId);

        return savedSegment;
    }

    async list(dto: QuerySegmentDto): Promise<{
        items: DatasetsSegments[];
        total: number;
        page: number;
        pageSize: number;
        needPolling: boolean;
    }> {
        const queryBuilder = this.segmentsRepository
            .createQueryBuilder("segment")
            .leftJoin("segment.document", "document");

        if (dto.documentId) {
            queryBuilder.andWhere("segment.documentId = :documentId", {
                documentId: dto.documentId,
            });
        }

        if (dto.keyword) {
            queryBuilder.andWhere("segment.content ILIKE :keyword", {
                keyword: `%${dto.keyword}%`,
            });
        }

        if (dto.status && dto.status !== "all") {
            queryBuilder.andWhere("segment.status = :status", { status: dto.status });
        }

        if (dto.startTime && dto.endTime) {
            queryBuilder.andWhere("segment.createdAt BETWEEN :startTime AND :endTime", {
                startTime: dto.startTime,
                endTime: dto.endTime,
            });
        }

        queryBuilder.orderBy("segment.chunkIndex", "ASC");

        const result = await this.paginateQueryBuilder(queryBuilder, dto);

        const needPolling = result.items.some(
            (segment: DatasetsSegments) =>
                segment.status === PROCESSING_STATUS.PROCESSING ||
                segment.status === PROCESSING_STATUS.PENDING,
        );

        return { ...result, needPolling };
    }

    async deleteSegment(id: string): Promise<boolean> {
        const segment = await this.getSegmentById(id);

        try {
            await this.delete(id);

            await this.documentRepository.decrement({ id: segment.documentId }, "chunkCount", 1);

            await this.documentRepository
                .createQueryBuilder()
                .update(DatasetsDocument)
                .set({
                    characterCount: () => `GREATEST(character_count - ${segment.contentLength}, 0)`,
                })
                .where("id = :id", { id: segment.documentId })
                .execute();

            await this.datasetsRepository.decrement({ id: segment.datasetId }, "chunkCount", 1);

            this.logger.log(
                `Segment deleted: ${id}, document: ${segment.documentId}, dataset: ${segment.datasetId}, chars: ${segment.contentLength}`,
            );
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete segment: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal(`Failed to delete segment: ${error.message}`);
        }
    }

    async batchDeleteSegments(segmentIds: string[]): Promise<{ success: boolean }> {
        const segments = await this.segmentsRepository.find({
            where: { id: In(segmentIds) },
            select: ["id", "datasetId", "documentId", "contentLength"],
        });

        if (segments.length !== segmentIds.length) {
            throw new Error("Some segments not found");
        }

        const datasetIds = [...new Set(segments.map((s) => s.datasetId))];
        if (datasetIds.length > 1) {
            throw new Error("Cannot delete segments across datasets");
        }

        const documentSegmentCounts = new Map<string, { count: number; characters: number }>();
        segments.forEach((segment) => {
            const stats = documentSegmentCounts.get(segment.documentId) || {
                count: 0,
                characters: 0,
            };
            stats.count += 1;
            stats.characters += segment.contentLength;
            documentSegmentCounts.set(segment.documentId, stats);
        });

        await this.segmentsRepository.delete({ id: In(segmentIds) });

        for (const [documentId, stats] of documentSegmentCounts) {
            await this.documentRepository
                .createQueryBuilder()
                .update(DatasetsDocument)
                .set({
                    chunkCount: () => `GREATEST(chunk_count - ${stats.count}, 0)`,
                    characterCount: () => `GREATEST(character_count - ${stats.characters}, 0)`,
                })
                .where("id = :documentId", { documentId })
                .execute();
        }

        await this.datasetsRepository.decrement(
            { id: datasetIds[0] },
            "chunkCount",
            segmentIds.length,
        );

        this.logger.log(`Batch deleted segments: [${segmentIds.join(",")}]`);
        return { success: true };
    }

    async updateSegment(id: string, dto: UpdateSegmentDto): Promise<DatasetsSegments> {
        const segment = await this.getSegmentById(id);
        const characterDiff = dto.content.length - segment.contentLength;

        try {
            await this.updateById(id, {
                content: dto.content,
                contentLength: dto.content.length,
                metadata: dto.metadata,
                status: PROCESSING_STATUS.PENDING,
            });

            if (characterDiff !== 0) {
                const absCharacterDiff = Math.abs(characterDiff);

                await this.documentRepository
                    .createQueryBuilder()
                    .update(DatasetsDocument)
                    .set({
                        characterCount: () =>
                            characterDiff > 0
                                ? `character_count + ${absCharacterDiff}`
                                : `GREATEST(character_count - ${absCharacterDiff}, 0)`,
                    })
                    .where("id = :id", { id: segment.documentId })
                    .execute();
            }

            // Trigger vectorization
            await this.vectorizationTrigger.triggerDocument(segment.datasetId, segment.documentId);

            this.logger.log(`Segment updated: ${id}, char diff: ${characterDiff}`);
            return this.findOneById(id) as Promise<DatasetsSegments>;
        } catch (error) {
            this.logger.error(`Failed to update segment: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal(`Failed to update segment: ${error.message}`);
        }
    }

    async getSegmentById(id: string): Promise<DatasetsSegments> {
        const segment = await this.findOneById(id);

        if (!segment) {
            throw HttpErrorFactory.notFound("Segment not found");
        }

        return segment as DatasetsSegments;
    }

    async setSegmentEnabled(id: string, enabled: number): Promise<{ success: boolean }> {
        await this.updateById(id, { enabled });
        return { success: true };
    }

    async batchSetSegmentEnabled(ids: string[], enabled: number): Promise<{ success: boolean }> {
        await this.segmentsRepository
            .createQueryBuilder()
            .update(DatasetsSegments)
            .set({ enabled })
            .whereInIds(ids)
            .execute();
        this.logger.log(`Batch segments [${ids.join(",")}] ${enabled ? "enabled" : "disabled"}`);
        return { success: true };
    }
}
