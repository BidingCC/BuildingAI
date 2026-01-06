import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";
import { createOllama } from "ai-sdk-ollama";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface OllamaProviderSettings extends BaseProviderSettings {
    baseURL?: string;
}

class OllamaProviderImpl implements AIProvider {
    readonly id = "ollama";
    readonly name = "Ollama";

    private baseProvider: ReturnType<typeof createOllama>;

    constructor(settings: OllamaProviderSettings = {}) {
        this.baseProvider = createOllama({
            baseURL: settings.baseURL || "http://localhost:11434/api",
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }
}

export function ollama(settings: OllamaProviderSettings = {}): AIProvider {
    return new OllamaProviderImpl(settings);
}
