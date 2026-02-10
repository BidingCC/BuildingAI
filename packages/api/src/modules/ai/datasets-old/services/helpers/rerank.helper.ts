import { getProvider, rerankGenerator, type RerankParams } from "@buildingai/ai-sdk";
import { SecretService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { RetrievalChunk } from "@buildingai/types/ai/retrieval-config.interface";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Rerank request parameters
 */
export interface RerankRequest {
    query: string;
    chunks: RetrievalChunk[];
    modelId: string;
    topK: number;
    scoreThreshold?: number;
    scoreThresholdEnabled?: boolean;
}

/**
 * Rerank helper service
 *
 * Handles reranking logic including model loading,
 * provider configuration, and rerank API calls.
 */
@Injectable()
export class RerankHelper {
    private readonly logger = new Logger(RerankHelper.name);

    constructor(
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
    ) {}

    /**
     * Rerank chunks based on relevance to query
     *
     * @param request - Rerank request parameters
     * @returns Reranked and filtered chunks
     */
    async rerank(request: RerankRequest): Promise<RetrievalChunk[]> {
        const { query, chunks, modelId, topK, scoreThreshold, scoreThresholdEnabled } = request;

        if (!chunks || chunks.length === 0) {
            return [];
        }

        try {
            const rerankModel = await this.getRerankModel(modelId);
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                rerankModel.provider.bindSecretId,
            );

            const adapter = getProvider(rerankModel.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret),
            });

            const generator = rerankGenerator(adapter);
            const rerankParams: RerankParams = {
                model: rerankModel.model,
                query,
                documents: chunks.map((chunk) => chunk.content),
                top_n: topK,
            };

            const rerankResponse = await generator.rerank.create(rerankParams);

            return rerankResponse.results
                .filter(
                    (result) =>
                        !scoreThresholdEnabled || result.relevance_score >= (scoreThreshold || 0),
                )
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .map((result) => ({
                    ...chunks[result.index],
                    relevanceScore: result.relevance_score,
                }));
        } catch (error) {
            this.logger.error(`Rerank failed for model ${modelId}: ${error.message}`, error.stack);

            // Fallback: return original chunks with filtering
            return this.fallbackRerank(chunks, topK, scoreThreshold, scoreThresholdEnabled);
        }
    }

    /**
     * Fallback rerank when API fails
     *
     * Simply filters and limits chunks without reranking.
     */
    private fallbackRerank(
        chunks: RetrievalChunk[],
        topK: number,
        scoreThreshold?: number,
        scoreThresholdEnabled?: boolean,
    ): RetrievalChunk[] {
        this.logger.warn("Using fallback rerank (no actual reranking)");

        return chunks
            .filter((chunk) => !scoreThresholdEnabled || chunk.score >= (scoreThreshold || 0))
            .slice(0, topK);
    }

    /**
     * Retrieve and validate rerank model
     *
     * @param modelId - Model ID
     * @returns Model entity with provider relation
     */
    private async getRerankModel(modelId: string): Promise<any> {
        const model = await this.aiModelService.findOne({
            where: { id: modelId, isActive: true },
            relations: ["provider"],
        });

        if (!model) {
            throw HttpErrorFactory.notFound(`Rerank model not found: ${modelId}`);
        }

        return model;
    }
}
