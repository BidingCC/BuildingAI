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
    Tag,
    User,
} from "@buildingai/db/entities";
import { AiModelModule } from "@modules/ai/model/ai-model.module";
import { ConfigModule } from "@modules/config/config.module";
import { UploadModule } from "@modules/upload/upload.module";
import { UserModule } from "@modules/user/user.module";
import { forwardRef, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { DatasetsConsoleController } from "./controllers/console/datasets.controller";
import { DatasetsDocumentsConsoleController } from "./controllers/console/datasets-documents.controller";
import { DatasetsMemberConsoleController } from "./controllers/console/datasets-member.controller";
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
import { DatasetMemberApplicationService } from "./services/datasets-member-application.service";
import { DatasetsQueryPreprocessorService } from "./services/datasets-query-preprocessor.service";
import { DatasetsRetrievalService } from "./services/datasets-retrieval.service";
import { DatasetsSegmentService } from "./services/datasets-segment.service";
import { DocumentSummaryService } from "./services/document-summary.service";
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
            Tag,
            User,
        ]),
        ConfigModule,
        QueueModule,
        UploadModule,
        AiModelModule,
        forwardRef(() => UserModule),
    ],
    controllers: [
        DatasetsConsoleController,
        DatasetsMemberConsoleController,
        DatasetsDocumentsConsoleController,
        DatasetsWebController,
        DatasetsDocumentsWebController,
        DatasetsMembersWebController,
        DatasetsChatRecordWebController,
        DatasetsChatMessageWebController,
    ],
    providers: [
        DatasetsService,
        DatasetMemberService,
        DatasetMemberApplicationService,
        DocumentSummaryService,
        DatasetsDocumentService,
        DatasetsSegmentService,
        DatasetsRetrievalService,
        DatasetsChatRecordService,
        DatasetsChatMessageService,
        DatasetsChatCompletionService,
        SegmentationService,
        DatasetsQueryPreprocessorService,
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
