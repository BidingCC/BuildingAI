import { DatasetsSegments } from "@buildingai/db/entities";

import { VectorizationErrorType } from "../constants/vectorization.constants";

/**
 * Embedding result for a single text
 */
export interface EmbeddingResult {
    /** Segment ID */
    segmentId: string;

    /** Generated embedding vector */
    embedding: number[];

    /** Vector dimension */
    dimension: number;

    /** Model ID used */
    modelId: string;

    /** Success flag */
    success: boolean;

    /** Error message if failed */
    error?: string;
}

/**
 * Progress callback function
 */
export type ProgressCallback = (
    processed: number,
    total: number,
    percentage: number,
) => void | Promise<void>;

/**
 * Batch embedding request
 */
export interface BatchEmbeddingRequest {
    /** Segments to embed */
    segments: DatasetsSegments[];

    /** Model configuration */
    modelConfig: ModelConfig;

    /** Batch size */
    batchSize?: number;

    /** Progress callback for real-time updates */
    onProgress?: ProgressCallback;
}

/**
 * Batch embedding response
 */
export interface BatchEmbeddingResponse {
    /** Successful embeddings */
    results: EmbeddingResult[];

    /** Number of successful embeddings */
    successCount: number;

    /** Number of failed embeddings */
    failureCount: number;

    /** Total processing time (ms) */
    processingTime: number;

    /** Error summary */
    errors?: Array<{
        segmentId: string;
        error: string;
        errorType: VectorizationErrorType;
    }>;
}

/**
 * Model configuration for embedding
 */
export interface ModelConfig {
    /** Model ID */
    modelId: string;

    /** Provider name */
    provider: string;

    /** API configuration */
    apiConfig: {
        apiKey: string;
        baseUrl?: string;
    };

    /** Model capabilities */
    capabilities: {
        /** Maximum batch size (1 for single-text models) */
        maxBatchSize: number;

        /** Maximum text length */
        maxTextLength?: number;

        /** Expected vector dimension */
        dimension?: number;
    };
}

/**
 * Vectorization progress
 */
export interface VectorizationProgress {
    /** Total segments to process */
    total: number;

    /** Processed segments */
    processed: number;

    /** Successfully vectorized */
    success: number;

    /** Failed segments */
    failed: number;

    /** Progress percentage (0-100) */
    percentage: number;

    /** Current status */
    status: string;
}

/**
 * Vectorization result
 */
export interface VectorizationResult {
    /** Success flag */
    success: boolean;

    /** Task type */
    type: "dataset" | "document";

    /** Entity ID (dataset or document) */
    entityId: string;

    /** Total segments processed */
    totalSegments: number;

    /** Successfully vectorized */
    successCount: number;

    /** Failed segments */
    failureCount: number;

    /** Total processing time (ms) */
    processingTime: number;

    /** Final status */
    finalStatus: string;

    /** Error message (if failed) */
    error?: string;

    /** Detailed error list */
    errors?: Array<{
        segmentId: string;
        error: string;
        errorType: VectorizationErrorType;
    }>;
}
