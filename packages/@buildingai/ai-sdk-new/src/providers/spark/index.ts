import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface SparkProviderSettings extends BaseProviderSettings {}

class SparkProviderImpl implements AIProvider {
    readonly id = "spark";
    readonly name = "讯飞星火";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;

    constructor(settings: SparkProviderSettings = {}) {
        this.baseProvider = createOpenAICompatible({
            name: "spark",
            baseURL: settings.baseURL || "https://spark-api-open.xf-yun.com/v1",
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

export function spark(settings: SparkProviderSettings = {}): AIProvider {
    return new SparkProviderImpl(settings);
}
