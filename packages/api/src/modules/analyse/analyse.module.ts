import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    AccountLog,
    Agent,
    AgentChatMessage,
    AgentChatRecord,
    AiChatMessage,
    AiChatRecord,
    AiModel,
    AiProvider,
    Analyse,
    Extension,
    RechargeOrder,
    User,
} from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { AnalyseConsoleController } from "./controller/console/analyse.controller";
import { AnalyseWebController } from "./controller/web/analyse.controller";
import { AnalyseService } from "./services/analyse.service";
import { DashboardService } from "./services/dashboard.service";

/**
 * 数据分析模块
 *
 * 提供后台工作台数据看板相关的功能
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Agent,
            AgentChatRecord,
            AgentChatMessage,
            AiChatRecord,
            AiChatMessage,
            RechargeOrder,
            AccountLog,
            Extension,
            AiModel,
            AiProvider,
            Analyse,
        ]),
    ],
    controllers: [AnalyseConsoleController, AnalyseWebController],
    providers: [DashboardService, AnalyseService],
    exports: [DashboardService, AnalyseService],
})
export class AnalyseModule {}
