// import { AiAgentModule } from "@modules/ai/agent/agent.module";
import { AiChatModule } from "@modules/ai/chat/ai-chat.module";
import { AiDatasetsModule } from "@modules/ai/datasets/datasets.module";
import { AiMcpModule } from "@modules/ai/mcp/ai-mcp.module";
import { AiModelModule } from "@modules/ai/model/ai-model.module";
import { AiProviderModule } from "@modules/ai/provider/ai-provider.module";
import { SecretManagerModule } from "@modules/ai/secret/secret.module";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        // AiAgentModule,
        AiChatModule,
        AiDatasetsModule,
        AiMcpModule,
        AiModelModule,
        AiProviderModule,
        SecretManagerModule,
    ],
    controllers: [],
    providers: [],
    exports: [
        // AiAgentModule,
        AiChatModule,
        AiDatasetsModule,
        AiMcpModule,
        AiModelModule,
        AiProviderModule,
        SecretManagerModule,
    ],
})
export class AiModule {}
