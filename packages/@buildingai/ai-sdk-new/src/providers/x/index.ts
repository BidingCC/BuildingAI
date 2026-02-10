import type { LanguageModelV3 } from "@ai-sdk/provider";
import { createXai, type XaiProvider as AISDKXaiProvider } from "@ai-sdk/xai";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface XProviderSettings extends BaseProviderSettings {}

class XProviderImpl implements AIProvider {
    readonly id = "x";
    readonly name = "xAI";

    private baseProvider: AISDKXaiProvider;

    constructor(settings: XProviderSettings = {}) {
        this.baseProvider = createXai({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL,
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }
}

export function x(settings: XProviderSettings = {}): AIProvider {
    return new XProviderImpl(settings);
}
