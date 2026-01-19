import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";
import {
    createOpenRouter,
    type OpenRouterProvider as AISDKOpenRouterProvider,
} from "@openrouter/ai-sdk-provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface OpenRouterProviderSettings extends BaseProviderSettings {}

class OpenRouterProviderImpl implements AIProvider {
    readonly id = "openrouter";
    readonly name = "OpenRouter";

    private baseProvider: AISDKOpenRouterProvider;

    constructor(settings: OpenRouterProviderSettings = {}) {
        this.baseProvider = createOpenRouter({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL,
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider(modelId) as unknown as LanguageModelV3;
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.textEmbeddingModel(modelId) as unknown as EmbeddingModelV3;
    }
}

export function openrouter(settings: OpenRouterProviderSettings = {}): AIProvider {
    return new OpenRouterProviderImpl(settings);
}
