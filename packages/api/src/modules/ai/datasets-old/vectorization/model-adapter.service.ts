import { SecretService } from "@buildingai/core/modules";
import { getProviderSecret } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";

import { AiModelService } from "../../model/services/ai-model.service";
import { classifyError, VectorizationErrorType } from "../constants/vectorization.constants";
import { ModelConfig } from "../interfaces/vectorization.interface";

/**
 * Model adapter service - Connects to AI model providers
 *
 * Responsibilities:
 * - Load and validate model configuration
 * - Create embedding generator instances
 * - Provide model capability information
 * - Abstract provider-specific details
 */
@Injectable()
export class ModelAdapterService {
    private readonly logger = new Logger(ModelAdapterService.name);

    constructor(
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
    ) {}

    private getValueFromConfig(key: string, config: Record<string, any>[]): string | number {
        return config.find((item) => item.key === key)?.value || null;
    }

    /**
     * Get model configuration by dataset
     */
    async getModelConfig(datasetId: string, embeddingModelId: string): Promise<ModelConfig> {
        try {
            // Load model from database
            const embeddingModel = await this.aiModelService.findOne({
                where: { id: embeddingModelId, isActive: true },
                relations: ["provider"],
            });

            if (!embeddingModel) {
                throw new Error(`Embedding model not found or inactive: ${embeddingModelId}`);
            }

            // Load provider secrets
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                embeddingModel.provider.bindSecretId,
            );

            // Extract model capabilities
            const modelConfig = embeddingModel.modelConfig || [];
            const maxBatchSize = Number(this.getValueFromConfig("max_chunks", modelConfig)) || 1;
            const maxTextLength = this.getValueFromConfig("max_tokens", modelConfig)
                ? Number(this.getValueFromConfig("max_tokens", modelConfig)) * 4
                : undefined;
            const dimension = Number(this.getValueFromConfig("dimension", modelConfig));

            return {
                modelId: embeddingModel.model,
                provider: embeddingModel.provider.provider,
                apiConfig: {
                    apiKey: getProviderSecret("apiKey", providerSecret),
                    baseUrl: getProviderSecret("baseUrl", providerSecret),
                },
                capabilities: {
                    maxBatchSize,
                    maxTextLength,
                    dimension,
                },
            };
        } catch (error) {
            this.logger.error(`Failed to get model config: ${error.message}`, error.stack);
            throw this.wrapError(error, VectorizationErrorType.INVALID_MODEL);
        }
    }

    /**
     * Create embedding generator instance
     */
    async createGenerator(modelConfig: ModelConfig): Promise<any> {
        try {
            const { embeddingGenerator, getProvider } = await import("@buildingai/ai-sdk");

            const adapter = getProvider(modelConfig.provider, {
                apiKey: modelConfig.apiConfig.apiKey,
                baseURL: modelConfig.apiConfig.baseUrl,
            });

            const generator = embeddingGenerator(adapter);

            this.logger.log(
                `Embedding generator created: ${modelConfig.provider}/${modelConfig.modelId}`,
            );

            return generator;
        } catch (error) {
            this.logger.error(`Failed to create generator: ${error.message}`, error.stack);
            throw this.wrapError(error, VectorizationErrorType.INVALID_MODEL);
        }
    }

    /**
     * Validate embedding result
     */
    validateEmbedding(
        embedding: number[],
        modelConfig: ModelConfig,
    ): { valid: boolean; error?: string } {
        if (!Array.isArray(embedding)) {
            return { valid: false, error: "Embedding is not an array" };
        }

        if (embedding.length === 0) {
            return { valid: false, error: "Embedding is empty" };
        }

        // Check dimension if specified
        if (
            modelConfig.capabilities.dimension &&
            embedding.length !== modelConfig.capabilities.dimension
        ) {
            return {
                valid: false,
                error: `Dimension mismatch: expected ${modelConfig.capabilities.dimension}, got ${embedding.length}`,
            };
        }

        // Check if all values are numbers
        if (!embedding.every((val) => typeof val === "number" && !isNaN(val))) {
            return { valid: false, error: "Embedding contains invalid values" };
        }

        return { valid: true };
    }

    /**
     * Calculate optimal batch size based on model capabilities and input size
     */
    calculateOptimalBatchSize(
        modelConfig: ModelConfig,
        totalSegments: number,
        preferredBatchSize: number = 10,
    ): number {
        const maxBatchSize = modelConfig.capabilities.maxBatchSize;

        // Single-text models must use batch size 1
        if (maxBatchSize === 1) {
            return 1;
        }

        // Use smaller of: model max, preferred size, or total segments
        const optimalSize = Math.min(maxBatchSize, preferredBatchSize, totalSegments);

        this.logger.debug(
            `Optimal batch size: ${optimalSize} (model max: ${maxBatchSize}, preferred: ${preferredBatchSize}, total: ${totalSegments})`,
        );

        return optimalSize;
    }

    /**
     * Check if model supports batch processing
     */
    supportsBatchProcessing(modelConfig: ModelConfig): boolean {
        return modelConfig.capabilities.maxBatchSize > 1;
    }

    /**
     * Wrap error with vectorization error type
     */
    private wrapError(error: Error, defaultType: VectorizationErrorType): Error {
        const errorType = classifyError(error);
        const wrappedError = new Error(error.message);
        (wrappedError as any).errorType =
            errorType !== VectorizationErrorType.FATAL ? errorType : defaultType;
        wrappedError.stack = error.stack;
        return wrappedError;
    }
}
