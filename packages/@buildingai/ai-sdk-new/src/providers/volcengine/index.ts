import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface VolcengineProviderSettings extends BaseProviderSettings {}

class VolcengineProviderImpl implements AIProvider {
    readonly id = "volcengine";
    readonly name = "火山引擎";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;

    constructor(settings: VolcengineProviderSettings = {}) {
        const baseURL = settings.baseURL || "https://ark.cn-beijing.volces.com/api/v3";

        this.baseProvider = createOpenAICompatible({
            name: "volcengine",
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

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }
}

export function volcengine(settings: VolcengineProviderSettings = {}): AIProvider {
    return new VolcengineProviderImpl(settings);
}
