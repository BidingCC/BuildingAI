import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    RerankConfig,
    RetrievalConfig,
    WeightConfig,
} from "@buildingai/types/ai/retrieval-config.interface";

import { RAG_SERVICE_CONSTANTS } from "../../constants/datasets-service.constants";

/**
 * Retrieval configuration builder
 *
 * Builds and validates retrieval configurations for datasets.
 * Handles weight calculation, rerank config, and hybrid strategy validation.
 */
export class RetrievalConfigBuilder {
    /**
     * Build complete retrieval configuration
     */
    static build(dto: RetrievalConfig | any): RetrievalConfig {
        const config: RetrievalConfig = {
            retrievalMode: dto.retrievalMode,
            topK: dto.topK,
            scoreThreshold: dto.scoreThreshold,
            scoreThresholdEnabled: dto.scoreThresholdEnabled,
            weightConfig: this.buildWeightConfig(dto.weightConfig, dto.retrievalMode),
        };

        const rerankCfg = dto.rerankConfig || dto.weightConfig?.rerank;
        if (rerankCfg) {
            config.rerankConfig = this.buildRerankConfig(rerankCfg);
        }

        if (dto.retrievalMode === RETRIEVAL_MODE.HYBRID) {
            config.strategy = dto.strategy || RAG_SERVICE_CONSTANTS.DEFAULT_HYBRID_STRATEGY;
            this.validateHybridConfig(config);
        }

        return config;
    }

    /**
     * Build weight configuration based on retrieval mode
     */
    static buildWeightConfig(weightConfig?: WeightConfig, mode?: string): WeightConfig {
        const config: WeightConfig = {};

        if (mode === RETRIEVAL_MODE.HYBRID) {
            config.semanticWeight =
                weightConfig?.semanticWeight ?? RAG_SERVICE_CONSTANTS.DEFAULT_SEMANTIC_WEIGHT;
            config.keywordWeight =
                weightConfig?.keywordWeight ?? RAG_SERVICE_CONSTANTS.DEFAULT_KEYWORD_WEIGHT;

            if (
                Math.abs(config.semanticWeight + config.keywordWeight - 1) >
                RAG_SERVICE_CONSTANTS.WEIGHT_SUM_TOLERANCE
            ) {
                throw HttpErrorFactory.badRequest(
                    "Semantic weight and keyword weight must sum to 1",
                );
            }
        } else if (mode === RETRIEVAL_MODE.VECTOR) {
            config.semanticWeight = 1.0;
            config.keywordWeight = 0.0;
        } else if (mode === RETRIEVAL_MODE.FULL_TEXT) {
            config.semanticWeight = 0.0;
            config.keywordWeight = 1.0;
        }

        return config;
    }

    /**
     * Build rerank configuration
     */
    static buildRerankConfig(cfg?: any): RerankConfig | undefined {
        if (!cfg) return undefined;

        if (cfg.enabled && !cfg.modelId) {
            throw HttpErrorFactory.badRequest("Model ID must be specified when enabling Rerank");
        }

        return {
            enabled: !!cfg.enabled,
            modelId: cfg.modelId || "",
        };
    }

    /**
     * Validate hybrid retrieval configuration
     */
    static validateHybridConfig(config: RetrievalConfig): void {
        if (
            config.strategy === RAG_SERVICE_CONSTANTS.RERANK_STRATEGY &&
            !config.rerankConfig?.enabled
        ) {
            throw HttpErrorFactory.badRequest(
                "Rerank must be enabled and model specified for hybrid retrieval rerank mode",
            );
        }
    }
}
