import { getProviderForEmbedding } from "@buildingai/ai-sdk-new";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { SecretService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument, DatasetsSegments } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable, Logger } from "@nestjs/common";
import { embedMany } from "ai";

import type {
    VectorizationProgressCallback,
    VectorizationResult,
} from "../interfaces/vectorization.interface";
import { DatasetsSegmentService } from "./datasets-segment.service";

function getMaxChunksFromModelConfig(
    modelConfig: Record<string, any>[] | undefined,
): number | null {
    if (!Array.isArray(modelConfig)) return null;
    const item = modelConfig.find((c) => (c.field ?? c.key) === "max_chunks");
    const raw = item?.value;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 ? n : null;
}

/**
 * 单文档向量化执行服务
 *
 * 拉取待向量化 Segments → 调 embedding API（embedMany）→ 写回 Segment + 更新 Document 进度
 */
@Injectable()
export class VectorizationRunnerService {
    private readonly logger = new Logger(VectorizationRunnerService.name);

    constructor(
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentRepository: Repository<DatasetsSegments>,
        private readonly segmentService: DatasetsSegmentService,
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
    ) {}

    /**
     * 执行单文档向量化
     */
    async run(
        documentId: string,
        datasetId: string,
        onProgress?: VectorizationProgressCallback,
    ): Promise<VectorizationResult> {
        const startTime = Date.now();

        const doc = await this.documentRepository.findOne({
            where: { id: documentId, datasetId },
            relations: ["dataset"],
        });
        if (!doc) {
            throw HttpErrorFactory.notFound("文档不存在");
        }

        const embeddingModelId = doc.embeddingModelId ?? doc.dataset?.embeddingModelId;
        if (!embeddingModelId) {
            await this.documentRepository.update(documentId, {
                status: PROCESSING_STATUS.FAILED,
                error: "未配置 Embedding 模型",
            });
            return {
                success: false,
                documentId,
                totalSegments: 0,
                successCount: 0,
                failureCount: 0,
                processingTime: Date.now() - startTime,
                finalStatus: PROCESSING_STATUS.FAILED,
            };
        }

        await this.documentRepository.update(documentId, {
            status: PROCESSING_STATUS.PROCESSING,
            progress: 0,
            error: null,
        });

        const pending = await this.segmentService.getPendingSegments(documentId);
        if (pending.length === 0) {
            await this.segmentService.syncDocumentProgress(documentId);
            const stats = await this.segmentService.getStatsByDocument(documentId);
            const { status } = this.segmentService.getDocumentStatusFromStats(stats);
            return {
                success: true,
                documentId,
                totalSegments: stats.total,
                successCount: stats.completed,
                failureCount: stats.failed,
                processingTime: Date.now() - startTime,
                finalStatus: status,
            };
        }

        const model = await this.aiModelService.findOne({
            where: { id: embeddingModelId, isActive: true },
            relations: ["provider"],
        });
        if (!model?.provider?.isActive) {
            await this.documentRepository.update(documentId, {
                status: PROCESSING_STATUS.FAILED,
                error: "Embedding 模型或供应商不可用",
            });
            return {
                success: false,
                documentId,
                totalSegments: pending.length,
                successCount: 0,
                failureCount: pending.length,
                processingTime: Date.now() - startTime,
                finalStatus: PROCESSING_STATUS.FAILED,
            };
        }

        const providerSecret = await this.secretService.getConfigKeyValuePairs(
            model.provider.bindSecretId!,
        );
        const provider = getProviderForEmbedding(model.provider.provider, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
        });
        const embeddingModel = provider(model.model);
        const batchSize = getMaxChunksFromModelConfig(model.modelConfig) ?? 10;

        const total = pending.length;
        let processed = 0;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < pending.length; i += batchSize) {
            const batch = pending.slice(i, i + batchSize);
            const texts = batch.map((s) => s.content);

            try {
                const { embeddings } = await embedMany({
                    model: embeddingModel.model,
                    values: texts,
                });

                const results = batch.map((seg, idx) => {
                    const emb = embeddings[idx];
                    const success = Array.isArray(emb) && emb.length > 0;
                    return {
                        segmentId: seg.id,
                        success,
                        embedding: success ? emb : undefined,
                        dimension: success ? emb.length : undefined,
                        modelId: model.model,
                        error: success ? undefined : "Empty embedding",
                    };
                });

                const failed = results.filter((r) => !r.success);
                if (failed.length > 0) {
                    this.logger.warn(
                        [
                            `Embedding returned failures (non-throw)`,
                            `documentId=${documentId}`,
                            `datasetId=${datasetId}`,
                            `provider=${model.provider.provider}`,
                            `model=${model.model}`,
                            `batch=${i}-${i + batch.length - 1}/${total}`,
                            `failed=${failed.length}/${results.length}`,
                            `segmentIds=${failed
                                .slice(0, 8)
                                .map((r) => r.segmentId)
                                .join(",")}${failed.length > 8 ? "..." : ""}`,
                            `reason=${failed[0]?.error ?? "Unknown"}`,
                        ].join(" | "),
                    );
                }

                await this.segmentService.saveEmbeddingResults(documentId, results);

                const batchSuccess = results.filter((r) => r.success).length;
                successCount += batchSuccess;
                failureCount += results.length - batchSuccess;
                processed += batch.length;
                const percentage = Math.round((processed / total) * 100);

                if (onProgress) {
                    try {
                        await onProgress(processed, total, percentage);
                    } catch {
                        // ignore
                    }
                }
            } catch (err: any) {
                console.log("Embedding batch error", {
                    documentId,
                    datasetId,
                    provider: model.provider.provider,
                    model: model.model,
                    batchRange: `${i}-${i + batch.length - 1}/${total}`,
                    segmentIds: batch.map((s) => s.id),
                    error: err?.message ?? "Unknown",
                });
                this.logger.error(
                    [
                        `Batch embedding threw error`,
                        `documentId=${documentId}`,
                        `datasetId=${datasetId}`,
                        `provider=${model.provider.provider}`,
                        `model=${model.model}`,
                        `batch=${i}-${i + batch.length - 1}/${total}`,
                        `segmentIds=${batch
                            .slice(0, 8)
                            .map((s) => s.id)
                            .join(",")}${batch.length > 8 ? "..." : ""}`,
                        `error=${err?.message ?? "Unknown"}`,
                    ].join(" | "),
                    err?.stack,
                );
                for (const seg of batch) {
                    await this.segmentRepository.update(seg.id, {
                        status: PROCESSING_STATUS.FAILED,
                        error: err?.message ?? "Embedding failed",
                    });
                }
                failureCount += batch.length;
                processed += batch.length;
            }
        }

        await this.segmentService.syncDocumentProgress(documentId);
        const stats = await this.segmentService.getStatsByDocument(documentId);
        const { status } = this.segmentService.getDocumentStatusFromStats(stats);

        if (failureCount === total) {
            await this.documentRepository.update(documentId, {
                status: PROCESSING_STATUS.FAILED,
                error: "全部分段向量化失败",
            });
        }

        const processingTime = Date.now() - startTime;
        this.logger.log(
            `Document vectorization completed: ${documentId} - ${successCount}/${total} success in ${processingTime}ms`,
        );

        return {
            success: failureCount < total,
            documentId,
            totalSegments: total,
            successCount,
            failureCount,
            processingTime,
            finalStatus: status,
        };
    }
}
