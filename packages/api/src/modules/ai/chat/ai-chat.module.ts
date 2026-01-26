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
import {
    ChatCompletionCommandHandler,
    ConversationCommandHandler,
    McpServerCommandHandler,
    MembershipValidationCommandHandler,
    MessageContextCommandHandler,
    ModelValidationCommandHandler,
    PowerDeductionCommandHandler,
    TitleGenerationCommandHandler,
    ToolCallCommandHandler,
    UserPowerValidationCommandHandler,
} from "./handlers";
import { AiChatsMessageService } from "./services/ai-chat-message.service";
import { AiChatRecordService } from "./services/ai-chat-record.service";
import { ChatConfigService } from "./services/chat-config.service";

/**
 * AI对话记录后台管理模块
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
        AiModelService,
        AiProviderService,
        SecretService,
        SecretTemplateService,
        AiMcpServerService,
        AiMcpToolService,
        AiUserMcpServer,
        AiChatRecordService,
        AiChatsMessageService,
        // Command Handlers
        ConversationCommandHandler,
        ModelValidationCommandHandler,
        MembershipValidationCommandHandler,
        UserPowerValidationCommandHandler,
        McpServerCommandHandler,
        MessageContextCommandHandler,
        ToolCallCommandHandler,
        PowerDeductionCommandHandler,
        TitleGenerationCommandHandler,
        ChatCompletionCommandHandler,
    ],
    exports: [ChatConfigService, AiChatRecordService, AiChatsMessageService],
})
export class AiChatModule {}
