import type { RerankModelV1, RerankParams, RerankResult } from "../../types";
import type { OpenAIProviderSettings } from "./index";

class OpenAIRerankModel implements RerankModelV1 {
    readonly modelId: string;
    readonly provider = "openai";

    private settings: OpenAIProviderSettings;

    constructor(settings: OpenAIProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doRerank(params: RerankParams): Promise<RerankResult> {
        const response = await fetch(`${this.settings.baseURL}/rerank`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
            body: JSON.stringify({
                model: this.modelId,
                query: params.query,
                documents: params.documents,
                top_n: params.topN || params.documents.length,
                return_documents: params.returnDocuments ?? false,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`重排序请求失败: ${response.status} ${error}`);
        }

        const data = await response.json();

        return {
            results: (data.results || data.rankings || []).map((item: any) => ({
                index: item.index,
                relevanceScore: item.relevance_score ?? item.score ?? 0,
                document: item.document?.text ?? item.document,
            })),
            model: data.model || this.modelId,
            usage: data.usage
                ? {
                      totalTokens: data.usage.total_tokens,
                  }
                : undefined,
        };
    }
}

export function createOpenAIRerankModel(
    settings: OpenAIProviderSettings,
    modelId: string,
): RerankModelV1 {
    return new OpenAIRerankModel(settings, modelId);
}
