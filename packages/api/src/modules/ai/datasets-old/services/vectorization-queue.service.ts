import { QueueService } from "@buildingai/core/modules";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";

/**
 * Vectorization queue service
 *
 * Manages vectorization queue operations with business-specific logic.
 * Encapsulates vectorization job configuration and queue management.
 */
@Injectable()
export class VectorizationQueueService {
    private readonly logger = new Logger(VectorizationQueueService.name);
    private readonly QUEUE_NAME = "vectorization";

    constructor(private readonly queueService: QueueService) {}

    /**
     * Add vectorization job to queue
     * @param type - Job type: 'dataset' | 'document'
     * @param params - Job parameters
     * @param options - Additional job options
     * @returns Promise resolving to the created job
     */
    async addVectorizationJob(
        type: "dataset" | "document",
        params: { datasetId: string; documentId?: string },
        options?: any,
    ): Promise<Job> {
        try {
            const job = await this.queueService.addToQueue(
                this.QUEUE_NAME,
                "vectorization",
                { type, params },
                {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 2000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                    ...options,
                },
            );

            const taskType = type === "dataset" ? "知识库" : "文档";
            const taskId = params.documentId || params.datasetId;
            this.logger.log(`${taskType}向量化任务已添加到队列: ${job.id} - ${taskId}`);
            return job;
        } catch (error) {
            this.logger.error(`添加向量化任务失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Add dataset vectorization job
     * @param datasetId - Dataset ID
     * @param options - Additional job options
     * @returns Promise resolving to the created job
     */
    async addDatasetVectorizationJob(datasetId: string, options?: any): Promise<Job> {
        return this.addVectorizationJob("dataset", { datasetId }, options);
    }

    /**
     * Add document vectorization job
     * @param datasetId - Dataset ID
     * @param documentId - Document ID
     * @param options - Additional job options
     * @returns Promise resolving to the created job
     */
    async addDocumentVectorizationJob(
        datasetId: string,
        documentId: string,
        options?: any,
    ): Promise<Job> {
        return this.addVectorizationJob("document", { datasetId, documentId }, options);
    }

    /**
     * Get all vectorization queue jobs
     * @returns Object containing jobs grouped by status
     */
    async getVectorizationQueueJobs() {
        try {
            return await this.queueService.getQueueJobs(this.QUEUE_NAME);
        } catch (error) {
            this.logger.error(`获取向量化队列任务失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get vectorization job by ID
     * @param jobId - Job ID
     * @returns Job details or null if not found
     */
    async getJobById(jobId: string) {
        return this.queueService.getJobById(this.QUEUE_NAME, jobId);
    }

    /**
     * Remove vectorization job
     * @param jobId - Job ID
     * @returns True if job was removed, false otherwise
     */
    async removeJob(jobId: string) {
        return this.queueService.removeJob(this.QUEUE_NAME, jobId);
    }

    /**
     * Retry failed vectorization job
     * @param jobId - Job ID
     * @returns True if job was retried, false otherwise
     */
    async retryJob(jobId: string) {
        return this.queueService.retryJob(this.QUEUE_NAME, jobId);
    }
}
