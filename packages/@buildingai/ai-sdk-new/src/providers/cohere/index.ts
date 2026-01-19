import { type CohereProvider as AISDKCohereProvider, createCohere } from "@ai-sdk/cohere";
import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface CohereProviderSettings extends BaseProviderSettings {}

class CohereProviderImpl implements AIProvider {
    readonly id = "cohere";
    readonly name = "Cohere";

    private baseProvider: AISDKCohereProvider;

    constructor(settings: CohereProviderSettings = {}) {
        this.baseProvider = createCohere({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL,
            headers: settings.headers,
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

export function cohere(settings: CohereProviderSettings = {}): AIProvider {
    return new CohereProviderImpl(settings);
}
