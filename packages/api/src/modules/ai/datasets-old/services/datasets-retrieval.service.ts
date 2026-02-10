import {
    PROCESSING_STATUS,
    RETRIEVAL_MODE,
    type RetrievalModeType,
} from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsSegments } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    DbQueryResult,
    FullTextSearchResult,
    HybridSearchResult,
    RerankConfig,
    RetrievalChunk,
    RetrievalConfig,
    RetrievalResult,
    VectorSearchResult,
    WeightConfig,
} from "@buildingai/types/ai/retrieval-config.interface";
import { Injectable, Logger } from "@nestjs/common";

import { RAG_SERVICE_CONSTANTS } from "../constants/datasets-service.constants";
import { EmbeddingHelper } from "./helpers/embedding.helper";
import { QueryPreprocessor } from "./helpers/query-preprocessor.helper";
import { RerankHelper } from "./helpers/rerank.helper";

/**
 * Dataset retrieval service for handling knowledge base queries
 */
@Injectable()
export class DatasetsRetrievalService {
    private readonly logger = new Logger(DatasetsRetrievalService.name);

    constructor(
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        private readonly embeddingHelper: EmbeddingHelper,
        private readonly rerankHelper: RerankHelper,
        private readonly queryPreprocessor: QueryPreprocessor,
    ) {}

    /**
     * Validates dataset existence and readiness
     */
    private async validateDataset(datasetId: string): Promise<Datasets> {
        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
        });
        if (!dataset) {
            throw HttpErrorFactory.notFound("Dataset not found");
        }
        return dataset;
    }

    /**
     * Maps database query results to RetrievalChunk format
     */
    private mapDbResultsToChunks(results: DbQueryResult[], scoreMultiplier = 1): RetrievalChunk[] {
        return results.map((result) => ({
            id: result.segment_id || result.id,
            documentId: result.document_id,
            content: result.segment_content || result.content,
            score: result.score * scoreMultiplier,
            metadata: result.segment_metadata,
            chunkIndex: result.chunk_index,
            contentLength: result.content_length,
            fileName: result.document_name,
        }));
    }

    /**
     * Builds base query for segments with common conditions
     */
    private buildBaseQuery(datasetId: string) {
        return this.segmentsRepository
            .createQueryBuilder("segment")
            .leftJoin("segment.document", "document")
            .select([
                "segment.id AS segment_id",
                "segment.documentId AS document_id",
                "segment.content AS segment_content",
                "segment.metadata AS segment_metadata",
                "segment.chunkIndex AS chunk_index",
                "segment.contentLength AS content_length",
                "document.fileName AS document_name",
            ])
            .where("segment.datasetId = :datasetId", { datasetId })
            .andWhere("segment.status = :status", {
                status: PROCESSING_STATUS.COMPLETED,
            })
            .andWhere("segment.enabled = :enabled", { enabled: 1 });
    }

    /**
     * Queries dataset with specified or default configuration
     */
    async queryDatasetWithConfig(
        datasetId: string,
        query: string,
        customConfig?: RetrievalConfig,
    ): Promise<RetrievalResult> {
        const startTime = Date.now();

        const dataset = await this.validateDataset(datasetId);
        const config = customConfig || dataset.retrievalConfig;
        const mode = customConfig?.retrievalMode || dataset.retrievalMode;
        const topK = config!.topK || RAG_SERVICE_CONSTANTS.DEFAULT_TOP_K;

        this.logger.debug(`[Retrieval Service] Retrieval mode: ${mode}`);
        this.logger.debug(
            `[Retrieval Service] Final config: ${JSON.stringify({ ...config, topK })}`,
        );

        const chunks = await this.dispatchRetrieval(mode, datasetId, query, {
            ...config,
            topK,
        });

        const totalTime = Date.now() - startTime;
        return {
            chunks,
            totalTime,
        };
    }

    /**
     * Dispatches retrieval based on mode
     */
    private async dispatchRetrieval(
        mode: RetrievalModeType,
        datasetId: string,
        query: string,
        config: RetrievalConfig,
    ): Promise<RetrievalChunk[]> {
        try {
            switch (mode) {
                case RETRIEVAL_MODE.VECTOR:
                    return (await this.performVectorSearch(datasetId, query, config)).chunks;
                case RETRIEVAL_MODE.FULL_TEXT:
                    return (await this.performFullTextSearch(datasetId, query, config)).chunks;
                case RETRIEVAL_MODE.HYBRID:
                    return (await this.performHybridSearch(datasetId, query, config)).chunks;
                default:
                    throw HttpErrorFactory.badRequest(`Unsupported retrieval mode: ${mode}`);
            }
        } catch (error) {
            this.logger.error(`Retrieval failed [mode: ${mode}]: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Performs vector search using embeddings
     */
    private async performVectorSearch(
        datasetId: string,
        query: string,
        config: RetrievalConfig,
    ): Promise<VectorSearchResult> {
        const { topK, scoreThreshold, scoreThresholdEnabled, rerankConfig } =
            this.normalizeConfig(config);

        const dataset = await this.validateDataset(datasetId);
        const queryEmbedding = await this.embeddingHelper.generateEmbedding(
            query,
            dataset.embeddingModelId,
        );

        let queryBuilder = this.buildBaseQuery(datasetId)
            .addSelect(
                "1 - (segment.embedding::vector <=> CAST(:queryEmbedding AS vector)) AS score",
            )
            .andWhere("segment.embedding IS NOT NULL")
            .orderBy("score", "DESC")
            .limit(topK)
            .setParameter("queryEmbedding", JSON.stringify(queryEmbedding));

        if (scoreThresholdEnabled) {
            queryBuilder = queryBuilder.andWhere(
                "(1 - (segment.embedding::vector <=> CAST(:queryEmbedding AS vector))) >= :scoreThreshold",
                { scoreThreshold },
            );
        }

        let dbResults: DbQueryResult[];
        try {
            dbResults = await queryBuilder.getRawMany();
        } catch (error) {
            this.logger.error("Vector search failed", error);
            throw new Error(
                "Vector search service unavailable, please ensure pgvector extension is properly installed",
            );
        }

        let chunks = this.mapDbResultsToChunks(
            dbResults,
            RAG_SERVICE_CONSTANTS.VECTOR_SCORE_MULTIPLIER,
        );
        const rerankUsed = rerankConfig?.enabled && rerankConfig.modelId;

        if (rerankUsed) {
            chunks = await this.rerankHelper.rerank({
                query,
                chunks,
                modelId: rerankConfig.modelId,
                topK,
                scoreThreshold,
                scoreThresholdEnabled,
            });
        }

        return {
            chunks,
            info: { topK, scoreThreshold, rerankUsed: !!rerankUsed },
        };
    }

    /**
     * Performs full-text search using PostgreSQL text search
     */
    private async performFullTextSearch(
        datasetId: string,
        query: string,
        config: RetrievalConfig,
    ): Promise<FullTextSearchResult> {
        const topK = config.topK || RAG_SERVICE_CONSTANTS.DEFAULT_TOP_K;

        const processedQuery = this.queryPreprocessor.preprocessForFullText(query);
        this.logger.debug(`[Full-text Search] "${query}" -> "${processedQuery}"`);

        const sql = `
            SELECT 
                segment.id AS segment_id,
                segment.document_id AS document_id,
                segment.content AS segment_content,
                segment.metadata AS segment_metadata,
                segment.chunk_index AS chunk_index,
                segment.content_length AS content_length,
                document.file_name AS document_name,
                ts_rank(to_tsvector('chinese_zh', coalesce(segment.content, '')), to_tsquery('chinese_zh', $3)) AS score
            FROM datasets_segments segment
            LEFT JOIN datasets_documents document ON document.id = segment.document_id
            WHERE segment.dataset_id = $1 
                AND segment.status = $2
                AND segment.enabled = 1
                AND to_tsvector('chinese_zh', coalesce(segment.content, '')) @@ to_tsquery('chinese_zh', $3)
            ORDER BY score DESC
            LIMIT ${topK}
        `;

        const dbResults = await this.segmentsRepository.query(sql, [
            datasetId,
            "completed",
            processedQuery,
        ]);

        this.logger.debug(`[Full-text Search] Query results: ${dbResults.length} items`);

        const chunks = this.mapDbResultsToChunks(
            dbResults,
            RAG_SERVICE_CONSTANTS.FULLTEXT_SCORE_MULTIPLIER,
        );

        return {
            chunks,
            info: { topK, rerankUsed: false },
        };
    }

    /**
     * Performs hybrid search with weighted or rerank strategy
     */
    private async performHybridSearch(
        datasetId: string,
        query: string,
        config: RetrievalConfig,
    ): Promise<HybridSearchResult> {
        const strategy = config.strategy || "weighted_score";
        const topK = config.topK || RAG_SERVICE_CONSTANTS.DEFAULT_TOP_K;

        const candidateConfig = {
            ...config,
            topK: Math.max(
                topK * RAG_SERVICE_CONSTANTS.HYBRID_CANDIDATE_MULTIPLIER,
                RAG_SERVICE_CONSTANTS.HYBRID_MIN_CANDIDATES,
            ),
        };

        if (strategy === "weighted_score") {
            return this.performWeightedHybridSearch(
                datasetId,
                query,
                config.weightConfig,
                candidateConfig,
                topK,
            );
        } else if (strategy === "rerank") {
            return this.performRerankHybridSearch(
                datasetId,
                query,
                config.rerankConfig,
                candidateConfig,
                topK,
            );
        } else {
            throw HttpErrorFactory.badRequest(`Unsupported hybrid retrieval strategy: ${strategy}`);
        }
    }

    /**
     * Performs weighted hybrid search
     */
    private async performWeightedHybridSearch(
        datasetId: string,
        query: string,
        weightConfig: WeightConfig | undefined,
        candidateConfig: RetrievalConfig,
        finalTopK: number,
    ): Promise<HybridSearchResult> {
        const semanticWeight =
            weightConfig?.semanticWeight ?? RAG_SERVICE_CONSTANTS.DEFAULT_SEMANTIC_WEIGHT;
        const keywordWeight =
            weightConfig?.keywordWeight ?? RAG_SERVICE_CONSTANTS.DEFAULT_KEYWORD_WEIGHT;

        const totalWeight = semanticWeight + keywordWeight;
        const normalizedSemanticWeight = semanticWeight / totalWeight;
        const normalizedKeywordWeight = keywordWeight / totalWeight;

        const [vectorResult, fullTextResult] = await Promise.all([
            this.performVectorSearch(datasetId, query, candidateConfig),
            this.performFullTextSearch(datasetId, query, candidateConfig),
        ]);

        const vectorScores = vectorResult.chunks.map((c) => c.score);
        const fullTextScores = fullTextResult.chunks.map((c) => c.score);
        const vectorMax = Math.max(...vectorScores, 0.01);
        const fullTextMax = Math.max(...fullTextScores, 0.01);

        const combinedChunks = new Map<
            string,
            RetrievalChunk & {
                _normalizedVectorScore: number;
                _normalizedFullTextScore: number;
            }
        >();

        vectorResult.chunks.forEach((chunk) => {
            combinedChunks.set(chunk.id, {
                ...chunk,
                _normalizedVectorScore: chunk.score / vectorMax,
                _normalizedFullTextScore: 0,
            });
        });

        fullTextResult.chunks.forEach((chunk) => {
            const normalizedScore = chunk.score / fullTextMax;
            if (combinedChunks.has(chunk.id)) {
                const existing = combinedChunks.get(chunk.id)!;
                existing._normalizedFullTextScore = normalizedScore;
            } else {
                combinedChunks.set(chunk.id, {
                    ...chunk,
                    _normalizedVectorScore: 0,
                    _normalizedFullTextScore: normalizedScore,
                });
            }
        });

        const finalChunks = Array.from(combinedChunks.values())
            .map((chunk) => ({
                ...chunk,
                score:
                    chunk._normalizedVectorScore * normalizedSemanticWeight +
                    chunk._normalizedFullTextScore * normalizedKeywordWeight,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, finalTopK)
            .map(({ _normalizedVectorScore, _normalizedFullTextScore, ...rest }) => rest);

        return {
            chunks: finalChunks,
            info: {
                strategy: "weighted_score",
                semanticWeight: normalizedSemanticWeight,
                keywordWeight: normalizedKeywordWeight,
                topK: finalTopK,
            },
        };
    }

    /**
     * Performs rerank-based hybrid search
     */
    private async performRerankHybridSearch(
        datasetId: string,
        query: string,
        rerankConfig: RerankConfig | undefined,
        candidateConfig: RetrievalConfig,
        finalTopK: number,
    ): Promise<HybridSearchResult> {
        const { scoreThreshold, scoreThresholdEnabled } = this.normalizeConfig(candidateConfig);

        const [vectorResult, fullTextResult] = await Promise.all([
            this.performVectorSearch(datasetId, query, candidateConfig),
            this.performFullTextSearch(datasetId, query, candidateConfig),
        ]);

        const candidateChunks = new Map<string, RetrievalChunk>();
        [...vectorResult.chunks, ...fullTextResult.chunks].forEach((chunk) => {
            const existing = candidateChunks.get(chunk.id);
            if (!existing || chunk.score > existing.score) {
                candidateChunks.set(chunk.id, chunk);
            }
        });

        const candidates = Array.from(candidateChunks.values());
        const finalChunks =
            rerankConfig?.enabled && rerankConfig.modelId
                ? await this.rerankHelper.rerank({
                      query,
                      chunks: candidates,
                      modelId: rerankConfig.modelId,
                      topK: finalTopK,
                      scoreThreshold,
                      scoreThresholdEnabled,
                  })
                : candidates
                      .filter((chunk) => !scoreThresholdEnabled || chunk.score >= scoreThreshold)
                      .sort((a, b) => b.score - a.score)
                      .slice(0, finalTopK);

        return {
            chunks: finalChunks,
            info: {
                strategy: "rerank",
                topK: finalTopK,
                scoreThreshold,
                rerankUsed: !!rerankConfig?.enabled,
            },
        };
    }

    /**
     * Normalizes retrieval configuration with defaults
     */
    private normalizeConfig(config: RetrievalConfig) {
        return {
            topK: config.topK ?? RAG_SERVICE_CONSTANTS.DEFAULT_TOP_K,
            scoreThreshold: config.scoreThreshold ?? RAG_SERVICE_CONSTANTS.DEFAULT_SCORE_THRESHOLD,
            scoreThresholdEnabled: config.scoreThresholdEnabled ?? false,
            rerankConfig: config.rerankConfig,
            weightConfig: config.weightConfig,
        };
    }
}
