import { DatasetsSegments } from "@buildingai/db/entities";
import { Injectable, Logger } from "@nestjs/common";

import {
    classifyError,
    VECTORIZATION_CONFIG,
    VectorizationErrorType,
} from "../constants/vectorization.constants";
import {
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    EmbeddingResult,
    ModelConfig,
} from "../interfaces/vectorization.interface";
import { ModelAdapterService } from "./model-adapter.service";

/**
 * Generator service - Batch generate embeddings
 *
 * Responsibilities:
 * - Call AI models to generate embeddings
 * - Handle batch processing optimization
 * - Manage error handling and classification
 * - Provide real-time progress updates
 * - NO state management or database operations
 */
@Injectable()
export class GeneratorService {
    private readonly logger = new Logger(GeneratorService.name);

    constructor(private readonly modelAdapter: ModelAdapterService) {}

    /**
     * Batch embed multiple segments with real-time progress updates
     */
    async batchEmbed(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
        const startTime = Date.now();
        const { segments, modelConfig, batchSize, onProgress } = request;

        if (!segments || segments.length === 0) {
            return {
                results: [],
                successCount: 0,
                failureCount: 0,
                processingTime: 0,
            };
        }

        this.logger.log(
            `Starting batch embedding: ${segments.length} segments with model ${modelConfig.modelId}`,
        );

        // Calculate optimal batch size
        const optimalBatchSize =
            batchSize ||
            this.modelAdapter.calculateOptimalBatchSize(
                modelConfig,
                segments.length,
                VECTORIZATION_CONFIG.DEFAULT_BATCH_SIZE,
            );

        // Create embedding generator
        const generator = await this.modelAdapter.createGenerator(modelConfig);

        // Process in batches with progress tracking
        const results: EmbeddingResult[] = [];
        const errors: Array<{
            segmentId: string;
            error: string;
            errorType: VectorizationErrorType;
        }> = [];

        const totalSegments = segments.length;
        let successCount = 0;

        for (let i = 0; i < segments.length; i += optimalBatchSize) {
            const batch = segments.slice(i, i + optimalBatchSize);
            const batchResults = await this.processBatch(batch, generator, modelConfig);

            results.push(...batchResults.results);
            if (batchResults.errors) {
                errors.push(...batchResults.errors);
            }

            // Update progress based on successful embeddings only
            const batchSuccessCount = batchResults.results.filter((r) => r.success).length;
            successCount += batchSuccessCount;
            const percentage = Math.round((successCount / totalSegments) * 100);

            this.logger.debug(
                `Batch ${Math.floor(i / optimalBatchSize) + 1} completed: ${batchSuccessCount} success, ${batchResults.results.length - batchSuccessCount} failed (${percentage}% overall)`,
            );

            // Call progress callback if provided (only update when there's success)
            if (onProgress && batchSuccessCount > 0) {
                try {
                    await onProgress(successCount, totalSegments, percentage);
                } catch (error) {
                    this.logger.warn(`Progress callback failed: ${error.message}`);
                }
            }
        }

        const finalSuccessCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;
        const processingTime = Date.now() - startTime;

        this.logger.log(
            `Batch embedding completed: ${finalSuccessCount} success, ${failureCount} failed, ${processingTime}ms`,
        );

        return {
            results,
            successCount: finalSuccessCount,
            failureCount,
            processingTime,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    /**
     * Process a single batch of segments
     */
    private async processBatch(
        batch: DatasetsSegments[],
        generator: any,
        modelConfig: ModelConfig,
    ): Promise<{
        results: EmbeddingResult[];
        errors?: Array<{ segmentId: string; error: string; errorType: VectorizationErrorType }>;
    }> {
        const results: EmbeddingResult[] = [];
        const errors: Array<{
            segmentId: string;
            error: string;
            errorType: VectorizationErrorType;
        }> = [];

        try {
            // For single-text models, process sequentially
            if (!this.modelAdapter.supportsBatchProcessing(modelConfig)) {
                for (const segment of batch) {
                    const result = await this.embedSingleInBatch(segment, generator, modelConfig);
                    results.push(result);

                    if (!result.success) {
                        errors.push({
                            segmentId: segment.id,
                            error: result.error || "Unknown error",
                            errorType: this.classifyErrorFromResult(result),
                        });
                    }
                }
            } else {
                // Batch processing for multi-text models
                const texts = batch.map((segment) => segment.content);

                const response = await generator.embeddings.create({
                    input: texts,
                    model: modelConfig.modelId,
                });

                if (!response.data || response.data.length !== batch.length) {
                    throw new Error(
                        `Embedding response mismatch: expected ${batch.length}, got ${response.data?.length || 0}`,
                    );
                }

                // Process results
                for (let i = 0; i < batch.length; i++) {
                    const segment = batch[i];
                    const embedding = response.data[i].embedding;

                    // Validate embedding
                    const validation = this.modelAdapter.validateEmbedding(embedding, modelConfig);

                    if (validation.valid) {
                        results.push({
                            segmentId: segment.id,
                            embedding,
                            dimension: embedding.length,
                            modelId: modelConfig.modelId,
                            success: true,
                        });
                    } else {
                        results.push({
                            segmentId: segment.id,
                            embedding: [],
                            dimension: 0,
                            modelId: modelConfig.modelId,
                            success: false,
                            error: validation.error,
                        });

                        errors.push({
                            segmentId: segment.id,
                            error: validation.error || "Validation failed",
                            errorType: VectorizationErrorType.INVALID_INPUT,
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Batch processing failed: ${error.message}`, error.stack);

            const errorType = classifyError(error);

            // Mark all segments in batch as failed
            for (const segment of batch) {
                results.push({
                    segmentId: segment.id,
                    embedding: [],
                    dimension: 0,
                    modelId: modelConfig.modelId,
                    success: false,
                    error: error.message,
                });

                errors.push({
                    segmentId: segment.id,
                    error: error.message,
                    errorType,
                });
            }
        }

        return { results, errors: errors.length > 0 ? errors : undefined };
    }

    /**
     * Embed single segment within a batch (for single-text models)
     */
    private async embedSingleInBatch(
        segment: DatasetsSegments,
        generator: any,
        modelConfig: ModelConfig,
    ): Promise<EmbeddingResult> {
        try {
            const response = await generator.embeddings.create({
                input: [segment.content],
                model: modelConfig.modelId,
            });

            if (!response.data || response.data.length === 0) {
                throw new Error("Empty embedding response");
            }

            const embedding = response.data[0].embedding;

            // Validate embedding
            const validation = this.modelAdapter.validateEmbedding(embedding, modelConfig);
            if (!validation.valid) {
                throw new Error(`Invalid embedding: ${validation.error}`);
            }

            return {
                segmentId: segment.id,
                embedding,
                dimension: embedding.length,
                modelId: modelConfig.modelId,
                success: true,
            };
        } catch (error) {
            return {
                segmentId: segment.id,
                embedding: [],
                dimension: 0,
                modelId: modelConfig.modelId,
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Classify error from embedding result
     */
    private classifyErrorFromResult(result: EmbeddingResult): VectorizationErrorType {
        if (!result.error) {
            return VectorizationErrorType.FATAL;
        }

        const error = new Error(result.error);
        return classifyError(error);
    }
}
