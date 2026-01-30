import { BaseService } from "@buildingai/base";
import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { DatasetsConfigService } from "@modules/config/services/datasets-config.service";
import { Injectable, Logger } from "@nestjs/common";

import { CreateEmptyDatasetDto } from "../dto/create-empty-dataset.dto";
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
        const { name, description } = dto;

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
}
