import { createOpenAI, type OpenAIProvider as AISDKOpenAIProvider } from "@ai-sdk/openai";
import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import type {
    AIProvider,
    BaseProviderSettings,
    ModerationModelV1,
    ProviderModelInfo,
} from "../../types";
import { fetchProviderModels } from "../../utils/fetch-models";
import { createOpenAIModerationModel } from "./moderation-model";
import { createOpenAIRerankModel } from "./rerank-model";

export interface OpenAIProviderSettings extends BaseProviderSettings {
    organization?: string;
    project?: string;
    compatibility?: "strict" | "compatible";
}

class OpenAIProviderImpl implements AIProvider {
    readonly id = "openai";
    readonly name = "OpenAI";

    private baseProvider: AISDKOpenAIProvider;
    private settings: OpenAIProviderSettings;

    constructor(settings: OpenAIProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://api.openai.com/v1",
        };

        this.baseProvider = createOpenAI({
            apiKey: this.settings.apiKey,
            baseURL: this.settings.baseURL,
            organization: this.settings.organization,
            project: this.settings.project,
            headers: this.settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    speech(modelId: string) {
        return this.baseProvider.speech(modelId);
    }

    transcription(modelId: string) {
        return this.baseProvider.transcription(modelId);
    }

    rerank(modelId: string): RerankingModelV3 {
        return createOpenAIRerankModel(this.settings, modelId);
    }

    moderation(modelId: string): ModerationModelV1 {
        return createOpenAIModerationModel(this.settings, modelId);
    }

    image(modelId: string) {
        return this.baseProvider.image(modelId);
    }

    async listModels(): Promise<ProviderModelInfo[]> {
        return fetchProviderModels(this.settings);
    }
}

export function openai(settings: OpenAIProviderSettings = {}): AIProvider {
    return new OpenAIProviderImpl(settings);
}
