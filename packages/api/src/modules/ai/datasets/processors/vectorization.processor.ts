import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { VectorizationRunnerService } from "../services/vectorization-runner.service";

@Processor("vectorization")
export class VectorizationProcessor extends WorkerHost {
    private readonly logger = new Logger(VectorizationProcessor.name);

    constructor(
        private readonly vectorizationRunner: VectorizationRunnerService,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
    ) {
        super();
    }

    async process(job: Job): Promise<unknown> {
        this.logger.log(`Processing vectorization job: ${job.name} (${job.id})`);

        if (job.name !== "vectorize_document") {
            this.logger.warn(`Unknown job name: ${job.name}`);
            return { success: false, reason: "Unknown job type" };
        }

        const data = job.data as {
            type: string;
            params: { documentId: string; datasetId: string };
        };
        const { documentId, datasetId } = data.params ?? {};
        if (!documentId || !datasetId) {
            this.logger.error("Job missing documentId or datasetId");
            return { success: false, reason: "Missing documentId or datasetId" };
        }

        try {
            await job.updateProgress(10);

            const progressCallback = async (
                processed: number,
                total: number,
                percentage: number,
            ) => {
                const jobProgress = 10 + Math.floor((percentage / 100) * 80);
                await job.updateProgress(jobProgress);
            };

            const result = await this.vectorizationRunner.run(
                documentId,
                datasetId,
                progressCallback,
            );

            await job.updateProgress(100);
            this.logger.log(
                `Vectorization job completed: ${job.id} - ${result.successCount}/${result.totalSegments} success`,
            );

            return {
                success: result.success,
                documentId,
                datasetId,
                totalSegments: result.totalSegments,
                successCount: result.successCount,
                failureCount: result.failureCount,
                processingTime: result.processingTime,
                finalStatus: result.finalStatus,
            };
        } catch (err: any) {
            this.logger.error(`Vectorization job failed: ${job.id} - ${err?.message}`, err?.stack);
            await this.documentRepository
                .update(documentId, {
                    status: PROCESSING_STATUS.FAILED,
                    error: err?.message ?? "Vectorization failed",
                })
                .catch(() => {});
            throw err;
        }
    }

    @OnWorkerEvent("completed")
    onCompleted(job: Job) {
        this.logger.log(`Job completed: ${job.name} (${job.id})`);
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, err: Error) {
        this.logger.error(`Job failed: ${job.name} (${job.id}) - ${err.message}`);
    }
}
