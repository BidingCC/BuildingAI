import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpServer, AiMcpTool, AiUserMcpServer, Dict } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { AiMcpServerConsoleController } from "./controllers/console/ai-mcp-server.controller";
import { WebAiMcpServerWebController } from "./controllers/web/ai-mcp-server.controller";
import { AiMcpServerService } from "./services/ai-mcp-server.service";
import { AiMcpToolService } from "./services/ai-mcp-tool.service";
import { WebAiMcpServerWebService } from "./services/web/ai-mcp-server.service";
import { UserMcpServerWebService } from "./services/web/user-mcp-server.service";

/**
 * AI对话记录后台管理模块
 */
@Module({
    imports: [TypeOrmModule.forFeature([Dict, AiMcpServer, AiMcpTool, AiUserMcpServer])],
    controllers: [AiMcpServerConsoleController, WebAiMcpServerWebController],
    providers: [
        AiMcpServerService,
        AiMcpToolService,
        WebAiMcpServerWebService,
        UserMcpServerWebService,
    ],
    exports: [
        AiMcpServerService,
        AiMcpToolService,
        WebAiMcpServerWebService,
        UserMcpServerWebService,
    ],
})
export class AiMcpModule {}
