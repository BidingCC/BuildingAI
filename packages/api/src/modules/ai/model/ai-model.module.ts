import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiModel } from "@buildingai/db/entities";
import { AiProvider } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { AiProviderService } from "../provider/services/ai-provider.service";
import { AiModelConsoleController } from "./controllers/console/ai-model.controller";
import { AiModelWebController } from "./controllers/web/ai-model.controller";
import { AiModelService } from "./services/ai-model.service";

/**
 * AI对话记录后台管理模块
 */
@Module({
    imports: [TypeOrmModule.forFeature([AiModel, Dict, AiProvider])],
    controllers: [AiModelConsoleController, AiModelWebController],
    providers: [AiModelService, AiProviderService],
    exports: [AiModelService, AiProviderService],
})
export class AiModelModule {}
