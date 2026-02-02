import { BaseService } from "@buildingai/base";
import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { DatasetsConfigService } from "@modules/config/services/datasets-config.service";
import { Injectable, Logger } from "@nestjs/common";

import { CreateEmptyDatasetDto } from "../dto/create-empty-dataset.dto";
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

    /**
     * 发布到广场（仅创建者可操作）
     */
    async publishToSquare(datasetId: string, userId: string): Promise<Datasets> {
        const dataset = await this.datasetMemberService.getDatasetOrThrow(datasetId);
        await this.datasetMemberService.requireCreator(datasetId, userId);
        if (dataset.publishedToSquare) {
            throw HttpErrorFactory.badRequest("该知识库已发布到广场");
        }
        await this.datasetsRepository.update(datasetId, {
            publishedToSquare: true,
            publishedAt: new Date(),
        });
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    /**
     * 从广场取消发布（仅创建者可操作）
     */
    async unpublishFromSquare(datasetId: string, userId: string): Promise<Datasets> {
        const dataset = await this.datasetMemberService.getDatasetOrThrow(datasetId);
        await this.datasetMemberService.requireCreator(datasetId, userId);
        if (!dataset.publishedToSquare) {
            throw HttpErrorFactory.badRequest("该知识库未发布到广场");
        }
        await this.datasetsRepository.update(datasetId, {
            publishedToSquare: false,
            publishedAt: null,
        });
        return this.findOneById(datasetId) as Promise<Datasets>;
    }

    /**
     * 我创建的知识库列表（分页）
     */
    async listMyCreated(userId: string, paginationDto: PaginationDto) {
        return this.paginate(paginationDto, {
            where: { createdBy: userId },
            order: { updatedAt: "DESC" },
        });
    }

    /**
     * 团队知识库列表（分页）：当前用户作为成员（且非创建者）的知识库
     */
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
}
