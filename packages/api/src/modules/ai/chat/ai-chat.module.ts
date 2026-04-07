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
    AiChatFeedback,
    AiChatMessage,
    AiChatRecord,
    AiChatToolCall,
    AiMcpServer,
    AiMcpTool,
    AiUserMcpServer,
    MembershipLevels,
    Secret,
    UserSubscription,
} from "@buildingai/db/entities";
import { forwardRef, Module } from "@nestjs/common";

import { UserModule } from "../../user/user.module";
import { AiMcpServerService } from "../mcp/services/ai-mcp-server.service";
import { AiMcpToolService } from "../mcp/services/ai-mcp-tool.service";
import { AiMemoryModule } from "../memory/ai-memory.module";
import { AiModelService } from "../model/services/ai-model.service";
import { AiProviderService } from "../provider/services/ai-provider.service";
import { AiChatFeedbackConsoleController } from "./controllers/console/ai-chat-feedback.controller";
import { AiChatRecordConsoleController } from "./controllers/console/ai-chat-record.controller";
import { AiChatFeedbackWebController } from "./controllers/web/ai-chat-feedback.controller";
import { AiChatMessageWebController } from "./controllers/web/ai-chat-message.controller";
import { AiChatRecordWebController } from "./controllers/web/ai-chat-record.controller";
import { ChatBillingHandler } from "./handlers/chat-billing.handler";
import { ChatTitleHandler } from "./handlers/chat-title.handler";
import { ChatCompletionService } from "./services/ai-chat-completion.service";
import { AiChatFeedbackService } from "./services/ai-chat-feedback.service";
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
        AiMemoryModule,
        forwardRef(() => UserModule),
        TypeOrmModule.forFeature([
            AiModel,
            AiProvider,
            AiUserMcpServer,
            AiMcpServer,
            AiMcpTool,
            AiChatRecord,
            AiChatMessage,
            AiChatFeedback,
            AiChatToolCall,
            Dict,
            AccountLog,
            Secret,
            SecretTemplate,
            User,
            UserSubscription,
            MembershipLevels,
        ]),
    ],
    controllers: [
        AiChatRecordConsoleController,
        AiChatFeedbackConsoleController,
        AiChatRecordWebController,
        AiChatMessageWebController,
        AiChatFeedbackWebController,
    ],
    providers: [
        ChatBillingHandler,
        ChatTitleHandler,
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
        AiChatFeedbackService,
    ],
    exports: [ChatConfigService, ChatCompletionService, AiChatRecordService, AiChatsMessageService],
})
export class AiChatModule {}
