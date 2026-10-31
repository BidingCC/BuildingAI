import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings, ProviderModelInfo } from "../../types";
import { fetchProviderModels } from "../../utils/fetch-models";

export interface EdenAIProviderSettings extends BaseProviderSettings {}

class EdenAIProviderImpl implements AIProvider {
    readonly id = "edenai";
    readonly name = "Eden AI";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: EdenAIProviderSettings;

    constructor(settings: EdenAIProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://api.edenai.run/v3",
        };

        this.baseProvider = createOpenAICompatible({
            name: "edenai",
            baseURL: this.settings.baseURL!,
            headers: {
                Authorization:
                    this.settings?.apiKey && this.settings?.apiKey.includes("Bearer ")
                        ? this.settings.apiKey
                        : `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    async listModels(): Promise<ProviderModelInfo[]> {
        return fetchProviderModels(this.settings);
    }
}

export function edenai(settings: EdenAIProviderSettings = {}): AIProvider {
    return new EdenAIProviderImpl(settings);
}
