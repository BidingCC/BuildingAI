import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";
import { adaptRerankModelV1ToV3 } from "../../utils/rerank-adapter";
import { createOpenAIRerankModel } from "../openai/rerank-model";

export interface WenXinProviderSettings extends BaseProviderSettings {}

class WenXinProviderImpl implements AIProvider {
    readonly id = "wenxin";
    readonly name = "文心一言";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: WenXinProviderSettings;

    constructor(settings: WenXinProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://qianfan.baidubce.com/v2",
        };

        this.baseProvider = createOpenAICompatible({
            name: "wenxin",
            baseURL: this.settings.baseURL!,
            headers: {
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    rerankModel(modelId: string): RerankingModelV3 {
        const v1Model = createOpenAIRerankModel(this.settings, modelId);
        return adaptRerankModelV1ToV3(v1Model);
    }
}

export function wenxin(settings: WenXinProviderSettings = {}): AIProvider {
    return new WenXinProviderImpl(settings);
}
