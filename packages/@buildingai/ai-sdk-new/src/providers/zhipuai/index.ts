import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";
import { createZhipu, type ZhipuProvider as AISDKZhipuProvider } from "zhipu-ai-provider";

import type { AIProvider, BaseProviderSettings } from "../../types";
import { adaptRerankModelV1ToV3 } from "../../utils/rerank-adapter";
import { createOpenAIRerankModel } from "../openai/rerank-model";

export interface ZhipuAIProviderSettings extends BaseProviderSettings {}

class ZhipuAIProviderImpl implements AIProvider {
    readonly id = "zhipuai";
    readonly name = "智谱AI";

    private baseProvider: AISDKZhipuProvider;
    private settings: ZhipuAIProviderSettings;

    constructor(settings: ZhipuAIProviderSettings = {}) {
        this.settings = {
            ...settings,
            baseURL: settings.baseURL || "https://open.bigmodel.cn/api/paas/v4",
        };

        this.baseProvider = createZhipu({
            apiKey: this.settings.apiKey,
            baseURL: this.settings.baseURL,
            headers: this.settings.headers,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider(modelId) as unknown as LanguageModelV3;
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.textEmbeddingModel(modelId) as unknown as EmbeddingModelV3;
    }

    rerankModel(modelId: string): RerankingModelV3 {
        const v1Model = createOpenAIRerankModel(this.settings, modelId);
        return adaptRerankModelV1ToV3(v1Model);
    }
}

export function zhipuai(settings: ZhipuAIProviderSettings = {}): AIProvider {
    return new ZhipuAIProviderImpl(settings);
}
