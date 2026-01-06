import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV3, LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface HunyuanProviderSettings extends BaseProviderSettings {}

class HunyuanProviderImpl implements AIProvider {
    readonly id = "hunyuan";
    readonly name = "腾讯混元";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;

    constructor(settings: HunyuanProviderSettings = {}) {
        const baseURL = settings.baseURL || "https://api.hunyuan.cloud.tencent.com/v1";

        this.baseProvider = createOpenAICompatible({
            name: "hunyuan",
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

export function hunyuan(settings: HunyuanProviderSettings = {}): AIProvider {
    return new HunyuanProviderImpl(settings);
}
