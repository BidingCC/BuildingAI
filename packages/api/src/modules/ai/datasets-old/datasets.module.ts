import { QueueModule } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AiModel } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import {
    DatasetMember,
    Datasets,
    DatasetsDocument,
    DatasetsSegments,
} from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { SecretManagerModule } from "@modules/ai/secret/secret.module";
import { UploadModule } from "@modules/upload/upload.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AiModelService } from "../model/services/ai-model.service";
import { DatasetsController } from "./controllers/console/datasets.controller";
import { DocumentsController } from "./controllers/console/documents.controller";
import { TeamMemberController } from "./controllers/console/member.controller";
import { SegmentsController } from "./controllers/console/segments.controller";
import { DatasetPermissionGuard } from "./guards/datasets-permission.guard";
import { VectorizationProcessor } from "./processors/vectorization.processor";
import { DatasetsService } from "./services/datasets.service";
import { DatasetMemberService } from "./services/datasets-member.service";
import { DatasetsRetrievalService } from "./services/datasets-retrieval.service";
import { DocumentsService } from "./services/documents.service";
import { FileParserService } from "./services/file-parser.service";
import { EmbeddingHelper } from "./services/helpers/embedding.helper";
import { QueryPreprocessor } from "./services/helpers/query-preprocessor.helper";
import { RerankHelper } from "./services/helpers/rerank.helper";
import { IndexingService } from "./services/indexing.service";
import { SegmentsService } from "./services/segments.service";
import { VectorizationQueueService } from "./services/vectorization-queue.service";
import { VectorizationTriggerService } from "./services/vectorization-trigger.service";
import {
    GeneratorService,
    ModelAdapterService,
    StateService,
    VectorizationService,
} from "./vectorization";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Datasets,
            DatasetsDocument,
            DatasetsSegments,
            DatasetMember,
            User,
            Dict,
            Agent,
            AiModel,
        ]),
        QueueModule,
        UploadModule,
        SecretManagerModule,
    ],
    controllers: [
        DatasetsController,
        DocumentsController,
        SegmentsController,
        TeamMemberController,
    ],
    providers: [
        // Core services
        DatasetsService,
        DatasetsRetrievalService,
        DocumentsService,
        SegmentsService,
        DatasetMemberService,

        // Helper services
        VectorizationQueueService,
        VectorizationTriggerService,
        FileParserService,
        IndexingService,
        EmbeddingHelper,
        RerankHelper,
        QueryPreprocessor,

        // Queue processors
        VectorizationProcessor,

        // Vectorization services
        ModelAdapterService,
        GeneratorService,
        StateService,
        VectorizationService,

        // External services
        DictService,
        AiModelService,

        // Guards
        DatasetPermissionGuard,
        {
            provide: APP_GUARD,
            useClass: DatasetPermissionGuard,
        },
    ],
    exports: [
        DatasetsService,
        DatasetsRetrievalService,
        DocumentsService,
        SegmentsService,
        DatasetMemberService,
        IndexingService,
        DatasetPermissionGuard,
    ],
})
export class AiDatasetsModuleOld {}
