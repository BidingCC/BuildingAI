import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { VectorizationService } from "../vectorization";

/**
 * Vectorization queue processor (BullMQ版)
 *
 * Responsibilities:
 * - Bridge between queue and vectorization service
 * - Handle job lifecycle (progress, completion, failure)
 * - Provide queue-specific error handling
 * - Keep business logic in vectorization service
 */
@Processor("vectorization")
export class VectorizationProcessor extends WorkerHost {
    private readonly logger = new Logger(VectorizationProcessor.name);

    constructor(private readonly vectorizationService: VectorizationService) {
        super();
    }

    /**
     * BullMQ 的核心执行函数
     */
    async process(job: Job): Promise<any> {
        this.logger.log(`➡️  开始向量化任务: ${job.name} (ID: ${job.id})`);
        this.logger.debug(`任务数据: ${JSON.stringify(job.data)}`);

        try {
            switch (job.name) {
                case "vectorization":
                    return await this.handleUnifiedVectorization(job);
                case "dataset":
                    return await this.handleDatasetVectorization(job);
                case "document":
                    return await this.handleDocumentVectorization(job);
                default:
                    this.logger.warn(`⚠️ 未知向量化任务类型: ${job.name}`);
                    return { success: false, reason: "Unknown vectorization job type" };
            }
        } catch (error) {
            this.logger.error(`❌ 向量化任务处理失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async handleUnifiedVectorization(job: Job<any>) {
        const { type, params } = job.data;
        const taskType = type === "dataset" ? "Dataset" : "Document";
        const taskId = params.documentId || params.datasetId;

        this.logger.log(`Processing ${taskType} vectorization job: ${job.id} - ${taskId}`);

        try {
            await job.updateProgress(10);

            // Create progress callback to update job progress in real-time
            const progressCallback = async (
                processed: number,
                total: number,
                percentage: number,
            ) => {
                // Map embedding progress (0-100%) to job progress (10-90%)
                // Reserve 10% for initialization and 10% for finalization
                const jobProgress = 10 + Math.floor((percentage / 100) * 80);
                await job.updateProgress(jobProgress);
                this.logger.debug(
                    `Job progress updated: ${jobProgress}% (${processed}/${total} segments)`,
                );
            };

            // Delegate to vectorization service with progress callback
            const result =
                type === "dataset"
                    ? await this.vectorizationService.vectorizeDataset(
                          params.datasetId,
                          progressCallback,
                      )
                    : await this.vectorizationService.vectorizeDocument(
                          params.documentId,
                          progressCallback,
                      );

            await job.updateProgress(100);

            this.logger.log(
                `${taskType} vectorization job completed: ${job.id} - ${result.successCount}/${result.totalSegments} success`,
            );

            return {
                success: result.success,
                type,
                taskId,
                totalSegments: result.totalSegments,
                successCount: result.successCount,
                failureCount: result.failureCount,
                processingTime: result.processingTime,
                finalStatus: result.finalStatus,
                processedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(
                `${taskType} vectorization job failed: ${job.id} - ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Handle dataset vectorization (legacy compatibility) with real-time progress
     */
    private async handleDatasetVectorization(job: Job<any>) {
        this.logger.log(`Processing dataset vectorization job (legacy): ${job.id}`);

        try {
            const { datasetId } = job.data;

            await job.updateProgress(10);

            // Create progress callback
            const progressCallback = async (
                processed: number,
                total: number,
                percentage: number,
            ) => {
                const jobProgress = 10 + Math.floor((percentage / 100) * 80);
                await job.updateProgress(jobProgress);
                this.logger.debug(
                    `Job progress updated: ${jobProgress}% (${processed}/${total} segments)`,
                );
            };

            const result = await this.vectorizationService.vectorizeDataset(
                datasetId,
                progressCallback,
            );

            await job.updateProgress(100);

            this.logger.log(
                `Dataset vectorization job completed: ${job.id} - ${result.successCount}/${result.totalSegments} success`,
            );

            return {
                success: result.success,
                datasetId,
                totalSegments: result.totalSegments,
                successCount: result.successCount,
                failureCount: result.failureCount,
                processingTime: result.processingTime,
                finalStatus: result.finalStatus,
                processedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(
                `Dataset vectorization job failed: ${job.id} - ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Handle document vectorization (legacy compatibility) with real-time progress
     */
    private async handleDocumentVectorization(job: Job<any>) {
        this.logger.log(`Processing document vectorization job (legacy): ${job.id}`);

        try {
            const { documentId } = job.data;

            await job.updateProgress(10);

            // Create progress callback
            const progressCallback = async (
                processed: number,
                total: number,
                percentage: number,
            ) => {
                const jobProgress = 10 + Math.floor((percentage / 100) * 80);
                await job.updateProgress(jobProgress);
                this.logger.debug(
                    `Job progress updated: ${jobProgress}% (${processed}/${total} segments)`,
                );
            };

            const result = await this.vectorizationService.vectorizeDocument(
                documentId,
                progressCallback,
            );

            await job.updateProgress(100);

            this.logger.log(
                `Document vectorization job completed: ${job.id} - ${result.successCount}/${result.totalSegments} success`,
            );

            return {
                success: result.success,
                documentId,
                totalSegments: result.totalSegments,
                successCount: result.successCount,
                failureCount: result.failureCount,
                processingTime: result.processingTime,
                finalStatus: result.finalStatus,
                processedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(
                `Document vectorization job failed: ${job.id} - ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * 可选：监听 Worker 事件（如完成、失败等）
     */
    @OnWorkerEvent("completed")
    onCompleted(job: Job) {
        this.logger.log(`🎉 向量化任务完成: ${job.name} (${job.id})`);
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, err: Error) {
        this.logger.error(`💥 向量化任务失败: ${job.name} (${job.id}) -> ${err.message}`);
    }
}
