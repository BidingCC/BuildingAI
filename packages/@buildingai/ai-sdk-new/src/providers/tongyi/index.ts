import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";
import { adaptRerankModelV1ToV3 } from "../../utils/rerank-adapter";
import { wrapLanguageModel } from "./model-wrapper";
import { createTongYiRerankModel } from "./rerank-model";

export interface TongYiProviderSettings extends BaseProviderSettings {
    baseURL?: string;
}

class TongYiProviderImpl implements AIProvider {
    readonly id = "tongyi";
    readonly name = "通义千问";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: TongYiProviderSettings;

    constructor(settings: TongYiProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
        };

        this.baseProvider = createOpenAICompatible({
            name: "tongyi",
            baseURL: this.settings.baseURL!,
            headers: {
                ...(this.settings.apiKey
                    ? { Authorization: `Bearer ${this.settings.apiKey}` }
                    : {}),
                ...this.settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        const baseModel = this.baseProvider.languageModel(modelId);
        return wrapLanguageModel(baseModel);
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    rerankModel(modelId: string): RerankingModelV3 {
        const v1Model = createTongYiRerankModel(this.settings, modelId);
        return adaptRerankModelV1ToV3(v1Model);
    }
}

export function tongyi(settings: TongYiProviderSettings = {}): AIProvider {
    return new TongYiProviderImpl(settings);
}
