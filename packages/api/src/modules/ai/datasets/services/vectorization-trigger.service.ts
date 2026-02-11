import { QueueService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class VectorizationTriggerService {
    private readonly logger = new Logger(VectorizationTriggerService.name);

    constructor(
        private readonly queueService: QueueService,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
    ) {}

    async triggerDocument(datasetId: string, documentId: string): Promise<void> {
        await this.queueService.addToQueue(
            "vectorization",
            "vectorize_document",
            {
                type: "document",
                params: { documentId, datasetId },
            },
            {
                jobId: `doc-${documentId}`,
                removeOnComplete: true,
            },
        );
        this.logger.log(`Vectorization job queued: document ${documentId}`);
    }

    async triggerDataset(datasetId: string): Promise<number> {
        const jobs = await this.queueService.getQueueJobs("vectorization");
        const existingDocIds = new Set(
            [...jobs.waiting, ...jobs.active]
                .map((j) => j.data?.params?.documentId)
                .filter(Boolean),
        );

        const documents = await this.documentRepository.find({
            where: {
                datasetId,
                status: In(["pending", "failed"]),
            },
            select: ["id"],
        });

        let added = 0;
        for (const doc of documents) {
            if (existingDocIds.has(doc.id)) continue;
            await this.triggerDocument(datasetId, doc.id);
            existingDocIds.add(doc.id);
            added++;
        }
        this.logger.log(`Dataset vectorization: ${added} document jobs queued for ${datasetId}`);
        return added;
    }

    async removeDocumentJobs(documentIds: string[]): Promise<number> {
        if (documentIds.length === 0) return 0;
        const jobs = await this.queueService.getQueueJobs("vectorization");
        const all = [...jobs.waiting, ...jobs.active, ...jobs.completed, ...jobs.failed];
        const idSet = new Set(documentIds);
        let removed = 0;
        for (const job of all) {
            const data = job.data;
            const params = data?.params;
            if (data?.type !== "document") continue;
            if (!params?.documentId) continue;
            if (!idSet.has(params.documentId)) continue;
            const ok = await this.queueService.removeJob("vectorization", String(job.id));
            if (ok) {
                removed++;
            }
        }
        if (removed > 0) {
            this.logger.log(
                `Removed ${removed} vectorization jobs for documents: ${documentIds.join(",")}`,
            );
        }
        return removed;
    }

    async removeDatasetJobs(datasetId: string): Promise<number> {
        const jobs = await this.queueService.getQueueJobs("vectorization");
        const all = [...jobs.waiting, ...jobs.active, ...jobs.completed, ...jobs.failed];
        let removed = 0;
        for (const job of all) {
            const data = job.data;
            const params = data?.params;
            if (data?.type !== "document") continue;
            if (!params?.datasetId) continue;
            if (params.datasetId !== datasetId) continue;
            const ok = await this.queueService.removeJob("vectorization", String(job.id));
            if (ok) {
                removed++;
            }
        }
        if (removed > 0) {
            this.logger.log(`Removed ${removed} vectorization jobs for dataset: ${datasetId}`);
        }
        return removed;
    }
}
