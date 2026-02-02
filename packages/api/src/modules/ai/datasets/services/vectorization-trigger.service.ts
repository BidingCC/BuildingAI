import { QueueService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * 向量化触发服务
 *
 * 封装入队逻辑：单文档 vectorize_document、按知识库批量入队（每个待处理文档一个 Job）
 */
@Injectable()
export class VectorizationTriggerService {
    private readonly logger = new Logger(VectorizationTriggerService.name);

    constructor(
        private readonly queueService: QueueService,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
    ) {}

    /**
     * 入队单文档向量化任务
     */
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

    /**
     * 按知识库批量入队：对该知识库下所有 status 为 pending/failed 的文档各入队一个 Job
     */
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
}
