import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type {
    EmbeddingModelV3,
    LanguageModelV3,
    LanguageModelV3Middleware,
    RerankingModelV3,
} from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

import type { AIProvider, BaseProviderSettings } from "../../types";
import { adaptRerankModelV1ToV3 } from "../../utils/rerank-adapter";
import {
    createTongyiSupportedUrls,
    transformTongyiCallOptionsForVideo,
    transformTongyiRequestBody,
} from "./message-transformer";
import { createTongYiRerankModel } from "./rerank-model";

export interface TongYiProviderSettings extends BaseProviderSettings {}

const wrapTongyiLanguageModel = (baseModel: LanguageModelV3): LanguageModelV3 => {
    const middleware: LanguageModelV3Middleware = {
        specificationVersion: "v3",
        overrideSupportedUrls: () => createTongyiSupportedUrls(baseModel.supportedUrls),
        transformParams: async ({ params }) => transformTongyiCallOptionsForVideo(params),
    };

    return wrapLanguageModel({
        model: baseModel,
        middleware,
    });
};

class TongYiProviderImpl implements AIProvider {
    readonly id = "tongyi";
    readonly name = "通义千问";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;
    private settings: TongYiProviderSettings;

    constructor(settings: TongYiProviderSettings = {}) {
        this.settings = settings;
        const baseURL = settings.baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

        this.baseProvider = createOpenAICompatible({
            name: "tongyi",
            baseURL,
            headers: {
                Authorization: `Bearer ${settings.apiKey}`,
                ...settings.headers,
            },
            transformRequestBody: transformTongyiRequestBody,
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return wrapTongyiLanguageModel(this.baseProvider.languageModel(modelId));
    }

    embeddingModel(modelId: string): EmbeddingModelV3 {
        return this.baseProvider.embeddingModel(modelId);
    }

    rerankModel(modelId: string): RerankingModelV3 {
        return adaptRerankModelV1ToV3(createTongYiRerankModel(this.settings, modelId));
    }
}

export function tongyi(settings: TongYiProviderSettings = {}): AIProvider {
    return new TongYiProviderImpl(settings);
}
