import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AgentAnnotation,
    AgentChatMessage,
    AgentChatRecord,
    AiModel,
    AiProvider,
    MembershipLevels,
    Tag,
    User,
    UserSubscription,
} from "@buildingai/db/entities";
import { MembershipValidationCommandHandler } from "@modules/ai/chat/handlers";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";

import { AiAgentConsoleController } from "./controllers/console/ai-agent.controller";
import { AiAgentV1Controller } from "./controllers/console/ai-agent-v1.controller";
import { AiAgentAnnotationController } from "./controllers/console/annotation.controller";
import { AiAgentChatMessageController } from "./controllers/console/chat-message.controller";
import { AiAgentChatRecordController } from "./controllers/console/chat-record.controller";
import { AiAgentTemplateController } from "./controllers/console/template.controller";
import { AiAgentWebController } from "./controllers/web/ai-agent.controller";
import { ChatHandlersModule } from "./handlers/handlers.module";
import { AiAgentService } from "./services/ai-agent.service";
import { AiAgentAnnotationService } from "./services/ai-agent-annotation.service";
import { AiAgentChatService } from "./services/ai-agent-chat.service";
import { AiAgentChatsMessageService } from "./services/ai-agent-chat-message.service";
import { AiAgentChatRecordService } from "./services/ai-agent-chat-record.service";
import { AiAgentTemplateService } from "./services/ai-agent-template.service";
import { AiAgentPublicChatService } from "./services/ai-agent-v1-chat.service";

/**
 * 智能体模块
 * 提供智能体管理和对话记录功能
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Agent,
            AgentAnnotation,
            AgentChatRecord,
            AgentChatMessage,
            User,
            Tag,
            AiModel,
            AiProvider,
            UserSubscription,
            MembershipLevels,
        ]),
        HttpModule,
        ChatHandlersModule, // 导入聊天处理器模块（已包含其他依赖模块）
    ],
    controllers: [
        AiAgentConsoleController,
        AiAgentTemplateController,
        AiAgentAnnotationController,
        AiAgentChatRecordController,
        AiAgentChatMessageController,
        AiAgentV1Controller,
        AiAgentWebController,
    ],
    providers: [
        AiAgentService,
        AiAgentAnnotationService,
        AiAgentChatRecordService,
        AiAgentChatService,
        AiAgentChatsMessageService,
        AiAgentPublicChatService,
        AiAgentTemplateService,
        MembershipValidationCommandHandler,
    ],
    exports: [
        AiAgentService,
        AiAgentAnnotationService,
        AiAgentChatRecordService,
        AiAgentChatService,
        AiAgentChatsMessageService,
        AiAgentTemplateService,
        AiAgentPublicChatService,
    ],
})
export class AiAgentModule {}
