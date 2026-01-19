import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";
import { type AzureProvider as AISDKAzureProvider, createAzure } from "@quail-ai/azure-ai-provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface AzureProviderSettings extends BaseProviderSettings {
    endpoint?: string;
    apiVersion?: string;
}

class AzureProviderImpl implements AIProvider {
    readonly id = "azure";
    readonly name = "Azure AI";

    private baseProvider: AISDKAzureProvider;
    private settings: AzureProviderSettings;

    constructor(settings: AzureProviderSettings = {}) {
        this.settings = settings;

        if (!settings.endpoint && !settings.baseURL) {
            throw new Error("Azure provider requires either 'endpoint' or 'baseURL' to be set");
        }

        this.baseProvider = createAzure({
            endpoint: settings.endpoint || settings.baseURL!,
            apiKey: settings.apiKey,
            apiVersion: settings.apiVersion,
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.textEmbeddingModel(modelId);
    }
}

export function azure(settings: AzureProviderSettings = {}): AIProvider {
    return new AzureProviderImpl(settings);
}
