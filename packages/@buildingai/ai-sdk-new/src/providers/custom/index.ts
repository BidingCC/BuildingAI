import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
import { createOpenAIImageModel } from "../openai/image-model";
import { createOpenAIModerationModel } from "../openai/moderation-model";
import { createOpenAIRerankModel } from "../openai/rerank-model";
import { createOpenAISpeechModel } from "../openai/speech-model";
import { createOpenAITranscriptionModel } from "../openai/transcription-model";

export interface CustomProviderSettings extends BaseProviderSettings {
    id?: string;
    name?: string;
}

class CustomProviderImpl implements AIProvider {
    readonly id: string;
    readonly name: string;

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: CustomProviderSettings;

    constructor(settings: CustomProviderSettings = {}) {
        this.id = settings.id || "custom";
        this.name = settings.name || "Custom";
        this.settings = settings;

        if (!settings.baseURL) {
            throw new Error("自定义 Provider 必须提供 baseURL");
        }

        this.baseProvider = createOpenAICompatible({
            name: this.id,
            baseURL: settings.baseURL,
            headers: {
                ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
                ...settings.headers,
            },
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
        const v1Model = createOpenAIRerankModel(this.settings, modelId);
        return adaptRerankModelV1ToV3(v1Model);
    }

    moderationModel(modelId: string): ModerationModelV1 {
        return createOpenAIModerationModel(this.settings, modelId);
    }

    imageModel(modelId: string): ImageModelV1 {
        return createOpenAIImageModel(this.settings, modelId);
    }
}

export function custom(settings: CustomProviderSettings = {}): AIProvider {
    return new CustomProviderImpl(settings);
}
