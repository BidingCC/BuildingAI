import { BaseService } from "@buildingai/base";
import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    DatasetMember,
    DatasetMemberApplication,
    Datasets,
    DatasetsChatMessage,
    DatasetsChatRecord,
    DatasetsDocument,
    DatasetsSegments,
    SquarePublishStatus,
} from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { DatasetsConfigService } from "@modules/config/services/datasets-config.service";
import { Injectable, Logger } from "@nestjs/common";

import { CreateEmptyDatasetDto } from "../dto/create-empty-dataset.dto";
import type { SetDatasetVectorConfigDto } from "../dto/set-dataset-vector-config.dto";
import { UpdateDatasetDto } from "../dto/update-dataset.dto";
import { DatasetMemberService } from "./datasets-member.service";

/**
 * 知识库服务
 *
 * 提供知识库创建等能力。
 */
@Injectable()
export class DatasetsService extends BaseService<Datasets> {
    protected readonly logger = new Logger(DatasetsService.name);

    constructor(
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentRepository: Repository<DatasetsSegments>,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(DatasetsChatRecord)
        private readonly chatRecordRepository: Repository<DatasetsChatRecord>,
        @InjectRepository(DatasetsChatMessage)
        private readonly chatMessageRepository: Repository<DatasetsChatMessage>,
        @InjectRepository(DatasetMemberApplication)
        private readonly applicationRepository: Repository<DatasetMemberApplication>,
        @InjectRepository(DatasetMember)
        private readonly datasetMemberRepository: Repository<DatasetMember>,
        private readonly datasetMemberService: DatasetMemberService,
        private readonly datasetsConfigService: DatasetsConfigService,
    ) {
        super(datasetsRepository);
    }

    /**
     * 创建空知识库
     *
     * 向量模型 ID 与检索设置从 config 字典表（datasets_config）读取。
     */
    async createEmptyDataset(dto: CreateEmptyDatasetDto, user: UserPlayground): Promise<Datasets> {
        const { name, description, coverUrl } = dto;

        const existing = await this.findOne({ where: { name, createdBy: user.id } });
        if (existing) throw HttpErrorFactory.badRequest("Dataset name already exists");

        const [embeddingModelId, retrievalConfig] = await Promise.all([
            this.datasetsConfigService.getEmbeddingModelId(),
            this.datasetsConfigService.getDefaultRetrievalConfig(),
        ]);
        if (!embeddingModelId?.trim()) {
            throw HttpErrorFactory.badRequest(
                "公共向量模型未配置，请在后台「知识库配置」中设置 embedding_model_id",
            );
        }

        const created = await this.create({
            name,
            description,
            ...(coverUrl !== undefined && { coverUrl }),
            createdBy: user.id,
            embeddingModelId: embeddingModelId.trim(),
            retrievalMode: retrievalConfig.retrievalMode ?? RETRIEVAL_MODE.HYBRID,
            retrievalConfig,
        });
        const dataset = (await this.findOneById(created.id!)) as Datasets;
        await this.datasetMemberService.initializeOwner(dataset.id, user.id);
        this.logger.log(`[+] Empty dataset created: ${user.id}`);
        return dataset;
    }

    async updateDataset(
        datasetId: string,
        dto: UpdateDatasetDto,
        userId: string,
    ): Promise<Datasets> {
        await this.datasetMemberService.getDatasetOrThrow(datasetId);
        await this.datasetMemberService.requireCreator(datasetId, userId);

        const payload: Record<string, unknown> = {};
        if (dto.name !== undefined) payload.name = dto.name;
        if (dto.description !== undefined) payload.description = dto.description;
        if (dto.coverUrl !== undefined) payload.coverUrl = dto.coverUrl;
        if (Object.keys(payload).length === 0) {
            return this.findOneById(datasetId) as Promise<Datasets>;
        }
        await this.datasetsRepository.update(datasetId, payload);
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    async updateVectorConfig(
        datasetId: string,
        dto: SetDatasetVectorConfigDto,
    ): Promise<Datasets> {
        await this.datasetMemberService.getDatasetOrThrow(datasetId);
        const payload: Record<string, unknown> = {};
        if (dto.embeddingModelId !== undefined) payload.embeddingModelId = dto.embeddingModelId;
        if (dto.retrievalMode !== undefined) payload.retrievalMode = dto.retrievalMode;
        if (dto.retrievalConfig !== undefined) payload.retrievalConfig = dto.retrievalConfig;
        if (Object.keys(payload).length === 0) {
            return this.findOneById(datasetId) as Promise<Datasets>;
        }
        await this.datasetsRepository.update(datasetId, payload);
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    async publishToSquare(datasetId: string, userId: string): Promise<Datasets> {
        const dataset = await this.datasetMemberService.getDatasetOrThrow(datasetId);
        await this.datasetMemberService.requireCreator(datasetId, userId);
        const status = (dataset as Datasets).squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status === SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("已提交审核，请等待审核结果");
        }
        if (dataset.publishedToSquare || status === SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("该知识库已发布到广场");
        }
        const skipReview = await this.datasetsConfigService.getSquarePublishSkipReview();
        if (skipReview) {
            await this.datasetsRepository.update(datasetId, {
                squarePublishStatus: SquarePublishStatus.APPROVED,
                publishedToSquare: true,
                publishedAt: new Date(),
            });
        } else {
            await this.datasetsRepository.update(datasetId, {
                squarePublishStatus: SquarePublishStatus.PENDING,
            });
        }
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    async unpublishFromSquare(datasetId: string, userId: string): Promise<Datasets> {
        const dataset = await this.datasetMemberService.getDatasetOrThrow(datasetId);
        await this.datasetMemberService.requireCreator(datasetId, userId);
        const status = (dataset as Datasets).squarePublishStatus ?? SquarePublishStatus.NONE;
        if (!dataset.publishedToSquare && status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("该知识库未发布到广场");
        }
        await this.datasetsRepository.update(datasetId, {
            publishedToSquare: false,
            publishedAt: null,
            squarePublishStatus: SquarePublishStatus.NONE,
            squareReviewedBy: null,
            squareReviewedAt: null,
            squareRejectReason: null,
        });
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    async approveSquarePublish(datasetId: string, operatorId: string): Promise<Datasets> {
        const dataset = await this.datasetMemberService.getDatasetOrThrow(datasetId);
        const status = (dataset as Datasets).squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("当前状态不可审核通过，仅待审核申请可操作");
        }
        await this.datasetsRepository.update(datasetId, {
            squarePublishStatus: SquarePublishStatus.APPROVED,
            publishedToSquare: true,
            publishedAt: new Date(),
            squareReviewedBy: operatorId,
            squareReviewedAt: new Date(),
            squareRejectReason: null,
        });
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    async rejectSquarePublish(
        datasetId: string,
        operatorId: string,
        reason?: string | null,
    ): Promise<Datasets> {
        const dataset = await this.datasetMemberService.getDatasetOrThrow(datasetId);
        const status = (dataset as Datasets).squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("当前状态不可审核拒绝，仅待审核申请可操作");
        }
        await this.datasetsRepository.update(datasetId, {
            squarePublishStatus: SquarePublishStatus.REJECTED,
            squareReviewedBy: operatorId,
            squareReviewedAt: new Date(),
            squareRejectReason: reason ?? null,
        });
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    async listMyCreated(userId: string, paginationDto: PaginationDto) {
        return this.paginate(paginationDto, {
            where: { createdBy: userId },
            order: { updatedAt: "DESC" },
        });
    }

    async listTeam(userId: string, paginationDto: PaginationDto) {
        const qb = this.datasetsRepository
            .createQueryBuilder("d")
            .innerJoin(
                "dataset_members",
                "m",
                "m.dataset_id = d.id AND m.user_id = :userId AND m.is_active = true",
                { userId },
            )
            .where("d.createdBy != :userId", { userId })
            .orderBy("d.updatedAt", "DESC");

        return this.paginateQueryBuilder(qb, paginationDto);
    }

    async deleteDataset(datasetId: string, userId: string): Promise<{ success: boolean }> {
        await this.datasetMemberService.getDatasetOrThrow(datasetId);
        await this.datasetMemberService.requireCreator(datasetId, userId);

        await this.dataSource.transaction(async (manager) => {
            const records = await manager
                .getRepository(DatasetsChatRecord)
                .find({ where: { datasetId }, select: { id: true } });
            const conversationIds = records.map((r) => r.id);
            if (conversationIds.length > 0) {
                await manager.getRepository(DatasetsChatMessage).delete({
                    conversationId: In(conversationIds),
                });
            }
            await manager.getRepository(DatasetsChatRecord).delete({ datasetId });
            await manager.getRepository(DatasetsSegments).delete({ datasetId });
            await manager.getRepository(DatasetsDocument).delete({ datasetId });
            await manager.getRepository(DatasetMemberApplication).delete({ datasetId });
            await manager.getRepository(DatasetMember).delete({ datasetId });
            await manager.getRepository(Datasets).delete({ id: datasetId });
        });

        this.logger.log(`[+] Deleted dataset: ${datasetId}`);
        return { success: true };
    }
}
