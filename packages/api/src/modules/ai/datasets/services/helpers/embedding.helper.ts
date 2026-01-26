import { embeddingGenerator, getProvider } from "@buildingai/ai-sdk";
import { SecretService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable, Logger } from "@nestjs/common";
import { CreateEmbeddingResponse } from "openai/resources/embeddings";

/**
 * Embedding helper service
 *
 * Handles embedding generation logic including model loading,
 * provider configuration, and API calls.
 */
@Injectable()
export class EmbeddingHelper {
    private readonly logger = new Logger(EmbeddingHelper.name);

    constructor(
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
    ) {}

    /**
     * Generate embedding for query text
     *
     * @param query - Query text to generate embedding for
     * @param modelId - Embedding model ID
     * @returns Embedding vector
     */
    async generateEmbedding(query: string, modelId: string): Promise<number[]> {
        try {
            const model = await this.getEmbeddingModel(modelId);
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId,
            );

            const adapter = getProvider(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret),
            });

            const generator = embeddingGenerator(adapter);
            const embeddingResponse: CreateEmbeddingResponse = await generator.embeddings.create({
                input: [query],
                model: model.model,
            });

            if (!embeddingResponse.data?.[0]?.embedding) {
                throw new Error("Embedding response is empty");
            }

            return embeddingResponse.data[0].embedding;
        } catch (error) {
            this.logger.error(
                `Failed to generate embedding for modelId ${modelId}: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.internal(`Embedding generation failed: ${error.message}`);
        }
    }

    /**
     * Retrieve and validate embedding model
     *
     * @param modelId - Model ID
     * @returns Model entity with provider relation
     */
    private async getEmbeddingModel(modelId: string): Promise<any> {
        const model = await this.aiModelService.findOne({
            where: { id: modelId, isActive: true },
            relations: ["provider"],
        });

        if (!model) {
            throw HttpErrorFactory.notFound(`Embedding model not found: ${modelId}`);
        }

        return model;
    }
}
