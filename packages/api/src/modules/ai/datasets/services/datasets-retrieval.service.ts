import { getProviderForEmbedding } from "@buildingai/ai-sdk-new";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { SecretService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets, DatasetsSegments } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import type {
    RetrievalChunk,
    RetrievalResult,
} from "@buildingai/types/ai/retrieval-config.interface";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable, Logger } from "@nestjs/common";
import { embed } from "ai";

import { DATASETS_DEFAULT_CONSTANTS } from "../constants/datasets.constants";

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * 知识库检索服务
 *
 * 根据 retrievalMode 执行向量/全文/混合检索，返回统一 RetrievalResult。
 * 当前实现：向量检索（内存余弦相似度），后续可接入 pgvector 与全文检索。
 */
@Injectable()
export class DatasetsRetrievalService {
    private readonly logger = new Logger(DatasetsRetrievalService.name);

    constructor(
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
    ) {}

    /**
     * 检索知识库
     * @param datasetId 知识库 ID
     * @param query 查询文本
     * @param topK 返回数量
     * @param scoreThreshold 相似度阈值
     */
    async retrieve(
        datasetId: string,
        query: string,
        topK?: number,
        scoreThreshold?: number,
    ): Promise<RetrievalResult> {
        const startTime = Date.now();
        this.logger.debug(`Retrieve: dataset=${datasetId}, query=${query?.slice(0, 50)}`);

        const k = topK ?? DATASETS_DEFAULT_CONSTANTS.DEFAULT_TOP_K;
        const threshold = scoreThreshold ?? DATASETS_DEFAULT_CONSTANTS.DEFAULT_SCORE_THRESHOLD;

        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
            select: ["id", "embeddingModelId", "retrievalConfig"],
        });
        if (!dataset) {
            throw HttpErrorFactory.notFound("知识库不存在");
        }

        const embeddingModelId =
            dataset.embeddingModelId ??
            (dataset.retrievalConfig as { embeddingModelId?: string })?.embeddingModelId;
        if (!embeddingModelId) {
            this.logger.warn("Dataset has no embedding model configured, returning empty chunks");
            return { chunks: [], totalTime: Date.now() - startTime };
        }

        const model = await this.aiModelService.findOne({
            where: { id: embeddingModelId, isActive: true },
            relations: ["provider"],
        });
        if (!model?.provider?.isActive) {
            this.logger.warn("Embedding model or provider inactive, returning empty chunks");
            return { chunks: [], totalTime: Date.now() - startTime };
        }

        const providerSecret = await this.secretService.getConfigKeyValuePairs(
            model.provider.bindSecretId!,
        );
        const provider = getProviderForEmbedding(model.provider.provider, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
        });
        const embeddingModel = provider(model.model);

        let queryEmbedding: number[];
        try {
            const input = (query || "").replace(/\n/g, " ").trim() || " ";
            const result = await embed({
                model: embeddingModel.model,
                value: input,
            });
            queryEmbedding = result.embedding;
        } catch (err) {
            this.logger.error(
                `Embed query failed: ${(err as Error).message}`,
                (err as Error).stack,
            );
            return { chunks: [], totalTime: Date.now() - startTime };
        }

        const segments = await this.segmentsRepository.find({
            where: {
                datasetId,
                status: PROCESSING_STATUS.COMPLETED,
                enabled: 1,
            },
            select: ["id", "content", "embedding", "chunkIndex", "contentLength", "documentId"],
            relations: ["document"],
            relationLoadStrategy: "query",
        });

        const withEmbedding = segments.filter(
            (s): s is typeof s & { embedding: number[] } =>
                Array.isArray(s.embedding) && s.embedding.length > 0,
        );
        const scored = withEmbedding.map((s) => ({
            segment: s,
            score: cosineSimilarity(queryEmbedding, s.embedding),
        }));
        scored.sort((a, b) => b.score - a.score);

        const chunks: RetrievalChunk[] = scored
            .filter((x) => x.score >= threshold)
            .slice(0, k)
            .map(({ segment, score }) => {
                const doc = segment.document;
                return {
                    id: segment.id,
                    content: segment.content,
                    score,
                    chunkIndex: segment.chunkIndex,
                    contentLength: segment.contentLength,
                    fileName: doc?.fileName,
                    metadata:
                        doc != null
                            ? {
                                  fileType: doc.fileType,
                                  fileUrl: doc.fileUrl ?? undefined,
                              }
                            : undefined,
                };
            });

        return {
            chunks,
            totalTime: Date.now() - startTime,
        };
    }
}
