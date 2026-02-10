import {
    type AnthropicProvider as AISDKAnthropicProvider,
    createAnthropic,
} from "@ai-sdk/anthropic";
import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface AnthropicProviderSettings extends BaseProviderSettings {}

class AnthropicProviderImpl implements AIProvider {
    readonly id = "anthropic";
    readonly name = "Anthropic";

    private baseProvider: AISDKAnthropicProvider;

    constructor(settings: AnthropicProviderSettings = {}) {
        this.baseProvider = createAnthropic({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL || "https://api.anthropic.com",
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }
}

export function anthropic(settings: AnthropicProviderSettings = {}): AIProvider {
    return new AnthropicProviderImpl(settings);
}
