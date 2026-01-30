import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { DictService } from "@buildingai/dict";
import type { RetrievalConfig } from "@buildingai/types/ai/retrieval-config.interface";
import { Injectable } from "@nestjs/common";

import {
    DATASETS_CONFIG_DEFAULT_RETRIEVAL,
    DATASETS_CONFIG_GROUP,
    DATASETS_CONFIG_KEYS,
} from "../constants/datasets-config.constants";

export interface DatasetsConfigDto {
    initialStorageMb: number;
    embeddingModelId: string;
    defaultRetrievalConfig: RetrievalConfig;
}

@Injectable()
export class DatasetsConfigService {
    constructor(private readonly dictService: DictService) {}

    async getInitialStorageMb(): Promise<number> {
        const value = await this.dictService.get<number | string>(
            DATASETS_CONFIG_KEYS.INITIAL_STORAGE_MB,
            100,
            DATASETS_CONFIG_GROUP,
        );
        if (value === undefined || value === null) return 100;
        const n = Number(value);
        return Number.isFinite(n) ? n : 100;
    }

    async getEmbeddingModelId(): Promise<string> {
        const value = await this.dictService.get<string>(
            DATASETS_CONFIG_KEYS.EMBEDDING_MODEL_ID,
            "",
            DATASETS_CONFIG_GROUP,
        );
        return typeof value === "string" ? value : "";
    }

    async getDefaultRetrievalConfig(): Promise<RetrievalConfig> {
        const raw = await this.dictService.get<RetrievalConfig>(
            DATASETS_CONFIG_KEYS.RETRIEVAL_CONFIG,
            undefined,
            DATASETS_CONFIG_GROUP,
        );
        if (raw && typeof raw === "object" && "retrievalMode" in raw) {
            return this.normalizeRetrievalConfig(raw);
        }
        return this.buildDefaultRetrievalConfig();
    }

    async getConfig(): Promise<DatasetsConfigDto> {
        const [initialStorageMb, embeddingModelId, defaultRetrievalConfig] = await Promise.all([
            this.getInitialStorageMb(),
            this.getEmbeddingModelId(),
            this.getDefaultRetrievalConfig(),
        ]);
        return {
            initialStorageMb,
            embeddingModelId,
            defaultRetrievalConfig,
        };
    }

    async setConfig(dto: Partial<DatasetsConfigDto>): Promise<DatasetsConfigDto> {
        if (dto.initialStorageMb !== undefined) {
            await this.dictService.set(
                DATASETS_CONFIG_KEYS.INITIAL_STORAGE_MB,
                dto.initialStorageMb,
                { group: DATASETS_CONFIG_GROUP },
            );
        }
        if (dto.embeddingModelId !== undefined) {
            await this.dictService.set(
                DATASETS_CONFIG_KEYS.EMBEDDING_MODEL_ID,
                dto.embeddingModelId,
                { group: DATASETS_CONFIG_GROUP },
            );
        }
        if (dto.defaultRetrievalConfig !== undefined) {
            const normalized = this.normalizeRetrievalConfig(
                dto.defaultRetrievalConfig as RetrievalConfig,
            );
            await this.dictService.set(DATASETS_CONFIG_KEYS.RETRIEVAL_CONFIG, normalized, {
                group: DATASETS_CONFIG_GROUP,
            });
        }
        return this.getConfig();
    }

    private normalizeRetrievalConfig(raw: RetrievalConfig): RetrievalConfig {
        const D = DATASETS_CONFIG_DEFAULT_RETRIEVAL;
        return {
            retrievalMode: raw.retrievalMode ?? RETRIEVAL_MODE.HYBRID,
            strategy: raw.strategy ?? "weighted_score",
            topK: raw.topK ?? D.TOP_K,
            scoreThreshold: raw.scoreThreshold ?? D.SCORE_THRESHOLD,
            scoreThresholdEnabled: raw.scoreThresholdEnabled ?? false,
            weightConfig: {
                semanticWeight: raw.weightConfig?.semanticWeight ?? D.SEMANTIC_WEIGHT,
                keywordWeight: raw.weightConfig?.keywordWeight ?? D.KEYWORD_WEIGHT,
            },
            rerankConfig: {
                enabled: raw.rerankConfig?.enabled ?? false,
                modelId: raw.rerankConfig?.modelId ?? "",
            },
        };
    }

    private buildDefaultRetrievalConfig(): RetrievalConfig {
        const D = DATASETS_CONFIG_DEFAULT_RETRIEVAL;
        return {
            retrievalMode: RETRIEVAL_MODE.HYBRID,
            strategy: "weighted_score",
            topK: D.TOP_K,
            scoreThreshold: D.SCORE_THRESHOLD,
            scoreThresholdEnabled: false,
            weightConfig: {
                semanticWeight: D.SEMANTIC_WEIGHT,
                keywordWeight: D.KEYWORD_WEIGHT,
            },
            rerankConfig: {
                enabled: false,
                modelId: "",
            },
        };
    }
}
