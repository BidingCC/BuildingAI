import { createDeepSeek, type DeepSeekProvider as AISDKDeepSeekProvider } from "@ai-sdk/deepseek";
import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface DeepSeekProviderSettings extends BaseProviderSettings {}

class DeepSeekProviderImpl implements AIProvider {
    readonly id = "deepseek";
    readonly name = "DeepSeek";

    private baseProvider: AISDKDeepSeekProvider;

    constructor(settings: DeepSeekProviderSettings = {}) {
        this.baseProvider = createDeepSeek({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL || "https://api.deepseek.com/v1",
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }
}

export function deepseek(settings: DeepSeekProviderSettings = {}): AIProvider {
    return new DeepSeekProviderImpl(settings);
}
