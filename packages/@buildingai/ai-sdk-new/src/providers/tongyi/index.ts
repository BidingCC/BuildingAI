import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";
import { createQwen, type QwenProvider as AISDKQwenProvider } from "qwen-ai-provider-v5";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface TongYiProviderSettings extends BaseProviderSettings {
    baseURL?: string;
}

class TongYiProviderImpl implements AIProvider {
    readonly id = "tongyi";
    readonly name = "通义千问";

    private baseProvider: AISDKQwenProvider;
    private settings: TongYiProviderSettings;

    constructor(settings: TongYiProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
        };

        this.baseProvider = createQwen({
            apiKey: this.settings.apiKey,
            baseURL: this.settings.baseURL,
            headers: this.settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    rerankModel(modelId: string): RerankingModelV3 {
        return this.baseProvider.rerankingModel(modelId);
    }
}

export function tongyi(settings: TongYiProviderSettings = {}): AIProvider {
    return new TongYiProviderImpl(settings);
}
