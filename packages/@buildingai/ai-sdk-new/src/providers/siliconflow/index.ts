import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings, ImageModelV1, SpeechModelV1 } from "../../types";
import { adaptRerankModelV1ToV3 } from "../../utils/rerank-adapter";
import { createOpenAIImageModel } from "../openai/image-model";
import { createOpenAIRerankModel } from "../openai/rerank-model";
import { createOpenAISpeechModel } from "../openai/speech-model";

export interface SiliconFlowProviderSettings extends BaseProviderSettings {}

class SiliconFlowProviderImpl implements AIProvider {
    readonly id = "siliconflow";
    readonly name = "硅基流动";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: SiliconFlowProviderSettings;

    constructor(settings: SiliconFlowProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://api.siliconflow.cn/v1",
        };

        this.baseProvider = createOpenAICompatible({
            name: "siliconflow",
            baseURL: this.settings.baseURL!,
            headers: {
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    rerankModel(modelId: string): RerankingModelV3 {
        const v1Model = createOpenAIRerankModel(this.settings, modelId);
        return adaptRerankModelV1ToV3(v1Model);
    }

    speechModel(modelId: string): SpeechModelV1 {
        return createOpenAISpeechModel(this.settings, modelId);
    }

    imageModel(modelId: string): ImageModelV1 {
        return createOpenAIImageModel(this.settings, modelId);
    }
}

export function siliconflow(settings: SiliconFlowProviderSettings = {}): AIProvider {
    return new SiliconFlowProviderImpl(settings);
}
