import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AiModel } from "@buildingai/db/entities";
import { AiProvider } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentAnnotation } from "@buildingai/db/entities";
import { AgentChatMessage } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { Tag } from "@buildingai/db/entities";
import { AiMcpServer, AiMcpTool, AiUserMcpServer } from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { AiMcpServerService } from "@modules/ai/mcp/services/ai-mcp-server.service";
import { AiMcpToolService } from "@modules/ai/mcp/services/ai-mcp-tool.service";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { SecretManagerModule } from "@modules/ai/secret/secret.module";
import { Module } from "@nestjs/common";

import { AiDatasetsModule } from "../../datasets/datasets.module";
import { AiAgentService } from "../services/ai-agent.service";
import { AiAgentAnnotationService } from "../services/ai-agent-annotation.service";
import { AiAgentChatsMessageService } from "../services/ai-agent-chat-message.service";
import { AiAgentChatRecordService } from "../services/ai-agent-chat-record.service";
import { AnnotationHandler } from "./annotation.handler";
import { BillingHandler } from "./billing.handler";
import { ChatContextBuilder } from "./chat-context.builder";
import { KnowledgeRetrievalHandler } from "./knowledge-retrieval.handler";
import { McpServerHandler } from "./mcp-server.handler";
import { MessageHandler } from "./message.handler";
import { QuickCommandHandler } from "./quick-command.handler";
import { ResponseHandler } from "./response.handler";
import { ThirdPartyIntegrationHandler } from "./third-party-integration.handler";
import { ToolCallHandler } from "./tool-call.handler";

/**
 * 智能体聊天处理器模块
 * 提供所有聊天相关的处理器服务
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Agent,
            Dict,
            AiModel,
            AiProvider,
            AiMcpServer,
            AiMcpTool,
            AiUserMcpServer,
            AgentAnnotation,
            AgentChatMessage,
            AgentChatRecord,
            User,
            Tag,
        ]),
        SecretManagerModule,
        AiDatasetsModule,
    ],
    providers: [
        MessageHandler,
        QuickCommandHandler,
        AnnotationHandler,
        KnowledgeRetrievalHandler,
        ThirdPartyIntegrationHandler,
        ChatContextBuilder,
        BillingHandler,
        ResponseHandler,
        McpServerHandler,
        ToolCallHandler,

        {
            provide: "IMessageHandler",
            useExisting: MessageHandler,
        },
        {
            provide: "IQuickCommandHandler",
            useExisting: QuickCommandHandler,
        },
        {
            provide: "IAnnotationHandler",
            useExisting: AnnotationHandler,
        },
        {
            provide: "IKnowledgeRetrievalHandler",
            useExisting: KnowledgeRetrievalHandler,
        },
        {
            provide: "IThirdPartyIntegrationHandler",
            useExisting: ThirdPartyIntegrationHandler,
        },
        {
            provide: "IChatContextBuilder",
            useExisting: ChatContextBuilder,
        },
        {
            provide: "IBillingHandler",
            useExisting: BillingHandler,
        },
        {
            provide: "IResponseHandler",
            useExisting: ResponseHandler,
        },

        AiAgentService,
        AiAgentAnnotationService,
        AiAgentChatsMessageService,
        AiAgentChatRecordService,
        AiModelService,
        AiMcpServerService,
        AiMcpToolService,
        DictService,
    ],
    exports: [
        MessageHandler,
        QuickCommandHandler,
        AnnotationHandler,
        KnowledgeRetrievalHandler,
        ThirdPartyIntegrationHandler,
        ChatContextBuilder,
        BillingHandler,
        ResponseHandler,
        McpServerHandler,
        ToolCallHandler,

        "IMessageHandler",
        "IQuickCommandHandler",
        "IAnnotationHandler",
        "IKnowledgeRetrievalHandler",
        "IThirdPartyIntegrationHandler",
        "IChatContextBuilder",
        "IBillingHandler",
        "IResponseHandler",
    ],
})
export class ChatHandlersModule {}
