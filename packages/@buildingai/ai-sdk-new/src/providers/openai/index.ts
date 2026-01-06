import { createOpenAI, type OpenAIProvider as AISDKOpenAIProvider } from "@ai-sdk/openai";
import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import type {
    AIProvider,
    BaseProviderSettings,
    ImageModelV1,
    ModerationModelV1,
    SpeechModelV1,
    TranscriptionModelV1,
} from "../../types";
import { adaptRerankModelV1ToV3 } from "../../utils/rerank-adapter";
import { createOpenAIImageModel } from "./image-model";
import { createOpenAIModerationModel } from "./moderation-model";
import { createOpenAIRerankModel } from "./rerank-model";
import { createOpenAISpeechModel } from "./speech-model";
import { createOpenAITranscriptionModel } from "./transcription-model";

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

    speechModel(modelId: string): SpeechModelV1 {
        return createOpenAISpeechModel(this.settings, modelId);
    }

    transcriptionModel(modelId: string): TranscriptionModelV1 {
        return createOpenAITranscriptionModel(this.settings, modelId);
    }

    rerankModel(modelId: string): RerankingModelV3 {
        console.log(
            `[OpenAIProviderImpl.rerankModel] 创建 rerank model, modelId: ${modelId}, baseURL: ${this.settings.baseURL}`,
        );
        const v1Model = createOpenAIRerankModel(this.settings, modelId);
        console.log(`[OpenAIProviderImpl.rerankModel] v1Model created:`, v1Model);
        const v3Model = adaptRerankModelV1ToV3(v1Model);
        console.log(`[OpenAIProviderImpl.rerankModel] v3Model created:`, v3Model);
        return v3Model;
    }

    moderationModel(modelId: string): ModerationModelV1 {
        return createOpenAIModerationModel(this.settings, modelId);
    }

    imageModel(modelId: string): ImageModelV1 {
        return createOpenAIImageModel(this.settings, modelId);
    }
}

export function openai(settings: OpenAIProviderSettings = {}): AIProvider {
    return new OpenAIProviderImpl(settings);
}
