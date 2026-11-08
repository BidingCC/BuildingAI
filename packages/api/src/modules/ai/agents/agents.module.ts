import { SecretService, SecretTemplateService } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AgentAnnotation,
    AgentChatMessage,
    AgentChatMessageFeedback,
    AgentChatRecord,
    AiMcpServer,
    AiMcpTool,
    AiModel,
    AiProvider,
    AiUserMcpServer,
    Datasets,
    Secret,
    SecretTemplate,
    Tag,
    User,
} from "@buildingai/db/entities";
import { agentPublicAccessRegistry } from "@common/decorators/agent-public-access.registry";
import { AiDatasetsModule } from "@modules/ai/datasets/datasets.module";
import { AiMcpServerService } from "@modules/ai/mcp/services/ai-mcp-server.service";
import { AiMcpToolService } from "@modules/ai/mcp/services/ai-mcp-tool.service";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { AiProviderService } from "@modules/ai/provider/services/ai-provider.service";
import { ConfigModule } from "@modules/config/config.module";
import { UserModule } from "@modules/user/user.module";
import { forwardRef, MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";

import { AiMemoryModule } from "../memory/ai-memory.module";
import { AgentsConsoleController } from "./controllers/console/agents.controller";
// import { AgentOpenApiController } from "./controllers/openapi/agent-chat.controller";
import { AgentAnnotationWebController } from "./controllers/web/agent-annotation.controller";
import { AgentChatWebController } from "./controllers/web/agent-chat.controller";
import { AgentPublishWebController } from "./controllers/web/agent-publish.controller";
import { AgentsWebController } from "./controllers/web/agents.controller";
import { AgentBillingHandler } from "./handlers/agent-billing";
import { AnnotationReplyHandler } from "./handlers/annotation-reply";
import { FollowUpSuggestionsHandler } from "./handlers/follow-up-suggestions";
import { GoalPlanner } from "./handlers/goal-planner";
import { PromptBuilder } from "./handlers/prompt-builder";
import { QuickCommandHandler } from "./handlers/quick-command";
import { ReflectionHandler } from "./handlers/reflection";
import { CozeAgentSyncService } from "./integrations/coze-agent-sync.service";
import { CozeApiService } from "./integrations/coze-api.service";
import { DifyAgentSyncService } from "./integrations/dify-agent-sync.service";
import { DifyApiService } from "./integrations/dify-api.service";
import { AgentAliasRewriteMiddleware } from "./middleware/agent-alias-rewrite.middleware";
import { CozeChatProvider } from "./providers/coze-chat.provider";
import { DifyChatProvider } from "./providers/dify-chat.provider";
import { AgentAnnotationService } from "./services/agent-annotation.service";
import { AgentChatCompletionService } from "./services/agent-chat-completion.service";
import { AgentChatMessageService } from "./services/agent-chat-message.service";
import { AgentChatMessageFeedbackService } from "./services/agent-chat-message-feedback.service";
import { AgentChatRecordService } from "./services/agent-chat-record.service";
import { AgentDashboardService } from "./services/agent-dashboard.service";
import { AgentVoiceService } from "./services/agent-voice.service";
import { AgentsService } from "./services/agents.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Agent,
            AgentAnnotation,
            Tag,
            User,
            Datasets,
            AgentChatRecord,
            AgentChatMessage,
            AgentChatMessageFeedback,
            AiModel,
            AiProvider,
            AiMcpServer,
            AiMcpTool,
            AiUserMcpServer,
            Secret,
            SecretTemplate,
        ]),
        forwardRef(() => AiDatasetsModule),
        AiMemoryModule,
        ConfigModule,
        forwardRef(() => UserModule),
    ],
    controllers: [
        AgentsConsoleController,
        AgentsWebController,
        AgentChatWebController,
        AgentPublishWebController,
        AgentAnnotationWebController,
        // AgentOpenApiController,
    ],
    providers: [
        AgentAliasRewriteMiddleware,
        // Agent CRUD
        AgentsService,
        AgentAnnotationService,
        AgentDashboardService,
        // Chat completion
        AgentChatCompletionService,
        AgentChatRecordService,
        AgentChatMessageService,
        AgentChatMessageFeedbackService,
        AgentVoiceService,
        // Handlers
        PromptBuilder,
        GoalPlanner,
        ReflectionHandler,
        FollowUpSuggestionsHandler,
        QuickCommandHandler,
        AnnotationReplyHandler,
        AgentBillingHandler,
        CozeApiService,
        CozeAgentSyncService,
        CozeChatProvider,
        DifyApiService,
        DifyAgentSyncService,
        DifyChatProvider,
        // Shared services (same pattern as AiChatModule)
        AiModelService,
        AiProviderService,
        SecretService,
        SecretTemplateService,
        AiMcpServerService,
        AiMcpToolService,
    ],
    exports: [AgentsService],
})
export class AiAgentsModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        const routes = agentPublicAccessRegistry.map((entry) => ({
            path: `v1/${entry.aliasPath}`,
            method: RequestMethod[entry.httpMethod],
        }));

        if (routes.length > 0) {
            consumer.apply(AgentAliasRewriteMiddleware).forRoutes(...routes);
        }
    }
}
