import { SecretService } from "@buildingai/core/modules";
import { SecretTemplateService } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AiModel } from "@buildingai/db/entities";
import { AiProvider } from "@buildingai/db/entities";
import { SecretTemplate } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import {
    AccountLog,
    AiChatMessage,
    AiChatRecord,
    AiChatToolCall,
    AiMcpServer,
    AiMcpTool,
    AiUserMcpServer,
    Secret,
    UserSubscription,
} from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { AiMcpServerService } from "../mcp/services/ai-mcp-server.service";
import { AiMcpToolService } from "../mcp/services/ai-mcp-tool.service";
import { AiModelService } from "../model/services/ai-model.service";
import { AiProviderService } from "../provider/services/ai-provider.service";
import { AiChatRecordConsoleController } from "./controllers/console/ai-chat-record.controller";
import { AiChatMessageWebController } from "./controllers/web/ai-chat-message.controller";
import { AiChatRecordWebController } from "./controllers/web/ai-chat-record.controller";
import { ChatCompletionService } from "./services/ai-chat-completion.service";
import { AiChatsMessageService } from "./services/ai-chat-message.service";
import { AiChatRecordService } from "./services/ai-chat-record.service";
import { ChatConfigService } from "./services/chat-config.service";

/**
 * AI对话模块
 *
 * 提供完整的AI对话功能，包括:
 * - 流式/非流式对话 (兼容 AI SDK useChat)
 * - 对话记录管理
 * - 消息管理
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            AiModel,
            AiProvider,
            AiUserMcpServer,
            AiMcpServer,
            AiMcpTool,
            AiChatRecord,
            AiChatMessage,
            AiChatToolCall,
            Dict,
            AccountLog,
            Secret,
            SecretTemplate,
            User,
            UserSubscription,
        ]),
    ],
    controllers: [
        AiChatRecordConsoleController,
        AiChatRecordWebController,
        AiChatMessageWebController,
    ],
    providers: [
        ChatConfigService,
        ChatCompletionService,
        AiModelService,
        AiProviderService,
        SecretService,
        SecretTemplateService,
        AiMcpServerService,
        AiMcpToolService,
        AiUserMcpServer,
        AiChatRecordService,
        AiChatsMessageService,
    ],
    exports: [ChatConfigService, ChatCompletionService, AiChatRecordService, AiChatsMessageService],
})
export class AiChatModule {}
