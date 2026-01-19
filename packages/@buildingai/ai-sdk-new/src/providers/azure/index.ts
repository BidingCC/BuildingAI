import { createAzure } from "@ai-sdk/azure";
import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface AzureProviderSettings extends BaseProviderSettings {
    resourceName?: string;
    apiVersion?: string;
}

class AzureProviderImpl implements AIProvider {
    readonly id = "azure";
    readonly name = "Azure AI";

    private baseProvider: ReturnType<typeof createAzure>;

    constructor(settings: AzureProviderSettings = {}) {
        this.baseProvider = createAzure({
            resourceName: settings.resourceName,
            baseURL: settings.baseURL,
            apiKey: settings.apiKey,
            apiVersion: settings.apiVersion,
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

export function azure(settings: AzureProviderSettings = {}): AIProvider {
    return new AzureProviderImpl(settings);
}
