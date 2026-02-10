import type { LanguageModelV3 } from "@ai-sdk/provider";
import { createMinimax } from "vercel-minimax-ai-provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface MiniMaxProviderSettings extends BaseProviderSettings {
    baseURL?: string;
}

class MiniMaxProviderImpl implements AIProvider {
    readonly id = "minimax";
    readonly name = "MiniMax";

    private baseProvider: ReturnType<typeof createMinimax>;

    constructor(settings: MiniMaxProviderSettings = {}) {
        this.baseProvider = createMinimax({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL || "https://api.minimax.io/anthropic/v1",
            headers: settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId) as unknown as LanguageModelV3;
    }
}

export function minimax(settings: MiniMaxProviderSettings = {}): AIProvider {
    return new MiniMaxProviderImpl(settings);
}
