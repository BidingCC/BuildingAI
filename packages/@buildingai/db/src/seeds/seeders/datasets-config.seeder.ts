import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";

import { Dict } from "../../entities/dict.entity";
import { DataSource } from "../../typeorm";
import { BaseSeeder } from "./base.seeder";

const DATASETS_CONFIG_GROUP = "datasets_config";

const DEFAULT_RETRIEVAL_CONFIG = {
    retrievalMode: RETRIEVAL_MODE.HYBRID,
    strategy: "weighted_score",
    topK: 3,
    scoreThreshold: 0.5,
    scoreThresholdEnabled: false,
    weightConfig: {
        semanticWeight: 0.7,
        keywordWeight: 0.3,
    },
    rerankConfig: {
        enabled: false,
        modelId: "",
    },
};

export class DatasetsConfigSeeder extends BaseSeeder {
    readonly name = "DatasetsConfigSeeder";
    readonly priority = 45;

    async run(dataSource: DataSource): Promise<void> {
        const dictRepository = dataSource.getRepository(Dict);

        try {
            await this.ensureConfig(
                dictRepository,
                "initial_storage_mb",
                "100",
                "知识库初始空间(Mb)",
                0,
            );
            await this.ensureConfig(dictRepository, "embedding_model_id", "", "公共向量模型ID", 1);
            await this.ensureConfig(
                dictRepository,
                "retrieval_config",
                JSON.stringify(DEFAULT_RETRIEVAL_CONFIG),
                "默认检索设置(RetrievalConfig)",
                2,
            );
            this.logSuccess("Datasets config initialized successfully");
        } catch (error) {
            this.logError(`Datasets config initialization failed: ${error.message}`);
            throw error;
        }
    }

    private async ensureConfig(
        dictRepository: ReturnType<DataSource["getRepository"]>,
        key: string,
        value: string,
        description: string,
        sort: number,
    ): Promise<void> {
        const existing = await dictRepository.findOne({
            where: { key, group: DATASETS_CONFIG_GROUP },
        });
        if (existing) {
            this.logInfo(
                `Config ${key} in group ${DATASETS_CONFIG_GROUP} already exists, skipping`,
            );
            return;
        }
        const config = dictRepository.create({
            key,
            value,
            group: DATASETS_CONFIG_GROUP,
            description,
            isEnabled: true,
            sort,
        });
        await dictRepository.save(config);
        this.logInfo(`Created config: ${key} in group ${DATASETS_CONFIG_GROUP}`);
    }
}
