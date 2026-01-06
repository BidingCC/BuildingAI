import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface MoonshotProviderSettings extends BaseProviderSettings {}

class MoonshotProviderImpl implements AIProvider {
    readonly id = "moonshot";
    readonly name = "月之暗面";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;

    constructor(settings: MoonshotProviderSettings = {}) {
        const baseURL = settings.baseURL || "https://api.moonshot.cn/v1";

        this.baseProvider = createOpenAICompatible({
            name: "moonshot",
            baseURL,
            headers: {
                Authorization: `Bearer ${settings.apiKey}`,
                ...settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }
}

export function moonshot(settings: MoonshotProviderSettings = {}): AIProvider {
    return new MoonshotProviderImpl(settings);
}
