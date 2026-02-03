import { QueueModule, SecretService } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    DatasetMember,
    DatasetMemberApplication,
    Datasets,
    DatasetsChatMessage,
    DatasetsChatRecord,
    DatasetsDocument,
    DatasetsSegments,
    User,
} from "@buildingai/db/entities";
import { AiModelModule } from "@modules/ai/model/ai-model.module";
import { ConfigModule } from "@modules/config/config.module";
import { UploadModule } from "@modules/upload/upload.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { DatasetsWebController } from "./controllers/web/datasets.controller";
import { DatasetsChatMessageWebController } from "./controllers/web/datasets-chat-message.controller";
import { DatasetsChatRecordWebController } from "./controllers/web/datasets-chat-record.controller";
import { DatasetsDocumentsWebController } from "./controllers/web/datasets-documents.controller";
import { DatasetsMembersWebController } from "./controllers/web/datasets-members.controller";
import { DatasetPermissionGuard } from "./guards/datasets-permission.guard";
import { VectorizationProcessor } from "./processors/vectorization.processor";
import { DatasetsService } from "./services/datasets.service";
import { DatasetsChatCompletionService } from "./services/datasets-chat-completion.service";
import { DatasetsChatMessageService } from "./services/datasets-chat-message.service";
import { DatasetsChatRecordService } from "./services/datasets-chat-record.service";
import { DatasetsDocumentService } from "./services/datasets-document.service";
import { DatasetMemberService } from "./services/datasets-member.service";
import { DatasetsRetrievalService } from "./services/datasets-retrieval.service";
import { DatasetsSegmentService } from "./services/datasets-segment.service";
import { SegmentationService } from "./services/segmentation.service";
import { VectorizationRunnerService } from "./services/vectorization-runner.service";
import { VectorizationTriggerService } from "./services/vectorization-trigger.service";

/**
 * 知识库模块（向量化数据集）
 *
 * Web 端知识库与文档接口；向量化队列消费在 Processor；不依赖 datasets-old。
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Datasets,
            DatasetMember,
            DatasetMemberApplication,
            DatasetsDocument,
            DatasetsSegments,
            DatasetsChatRecord,
            DatasetsChatMessage,
            User,
        ]),
        ConfigModule,
        QueueModule,
        UploadModule,
        AiModelModule,
    ],
    controllers: [
        DatasetsWebController,
        DatasetsDocumentsWebController,
        DatasetsMembersWebController,
        DatasetsChatRecordWebController,
        DatasetsChatMessageWebController,
    ],
    providers: [
        DatasetsService,
        DatasetMemberService,
        DatasetsDocumentService,
        DatasetsSegmentService,
        DatasetsRetrievalService,
        DatasetsChatRecordService,
        DatasetsChatMessageService,
        DatasetsChatCompletionService,
        SegmentationService,
        VectorizationTriggerService,
        VectorizationRunnerService,
        VectorizationProcessor,
        DatasetPermissionGuard,
        SecretService,
        { provide: APP_GUARD, useClass: DatasetPermissionGuard },
    ],
    exports: [
        DatasetsService,
        DatasetMemberService,
        DatasetsDocumentService,
        DatasetsSegmentService,
        DatasetsRetrievalService,
    ],
})
export class AiDatasetsModule {}
