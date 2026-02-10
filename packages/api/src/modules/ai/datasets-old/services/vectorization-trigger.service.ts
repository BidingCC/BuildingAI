import { Injectable, Logger } from "@nestjs/common";

import { VectorizationQueueService } from "./vectorization-queue.service";

/**
 * Vectorization trigger service
 *
 * Centralized service for triggering vectorization jobs.
 * Provides a unified interface for adding vectorization tasks to the queue.
 */
@Injectable()
export class VectorizationTriggerService {
    private readonly logger = new Logger(VectorizationTriggerService.name);

    constructor(private readonly vectorizationQueueService: VectorizationQueueService) {}

    /**
     * Trigger document vectorization
     * @param datasetId - Dataset ID
     * @param documentId - Document ID
     * @returns Promise that resolves when job is added to queue
     */
    async triggerDocument(datasetId: string, documentId: string): Promise<void> {
        try {
            await this.vectorizationQueueService.addVectorizationJob("document", {
                datasetId,
                documentId,
            });
            this.logger.log(`Document vectorization job queued: ${documentId}`);
        } catch (error) {
            this.logger.error(
                `Failed to trigger document vectorization: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Trigger dataset vectorization
     * @param datasetId - Dataset ID
     * @returns Promise that resolves when job is added to queue
     */
    async triggerDataset(datasetId: string): Promise<void> {
        try {
            await this.vectorizationQueueService.addVectorizationJob("dataset", {
                datasetId,
            });
            this.logger.log(`Dataset vectorization job queued: ${datasetId}`);
        } catch (error) {
            this.logger.error(
                `Failed to trigger dataset vectorization: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Trigger document vectorization without throwing error
     * Useful for background tasks where failure shouldn't block the main flow
     */
    async triggerDocumentSafely(datasetId: string, documentId: string): Promise<boolean> {
        try {
            await this.triggerDocument(datasetId, documentId);
            return true;
        } catch (error) {
            this.logger.warn(
                `Document vectorization trigger failed (safe mode): ${documentId}, ${error.message}`,
            );
            return false;
        }
    }

    /**
     * Trigger dataset vectorization without throwing error
     * Useful for background tasks where failure shouldn't block the main flow
     */
    async triggerDatasetSafely(datasetId: string): Promise<boolean> {
        try {
            await this.triggerDataset(datasetId);
            return true;
        } catch (error) {
            this.logger.warn(
                `Dataset vectorization trigger failed (safe mode): ${datasetId}, ${error.message}`,
            );
            return false;
        }
    }
}
