import type { RerankModelV1, RerankParams, RerankResult } from "../../types";
import type { TongYiProviderSettings } from "./index";

const TONGYI_RERANK_ENDPOINT =
    "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank";

class TongYiRerankModel implements RerankModelV1 {
    readonly modelId: string;
    readonly provider = "tongyi";

    private settings: TongYiProviderSettings;

    constructor(settings: TongYiProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doRerank(params: RerankParams): Promise<RerankResult> {
        const response = await fetch(TONGYI_RERANK_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(this.settings.apiKey
                    ? { Authorization: `Bearer ${this.settings.apiKey}` }
                    : {}),
                ...this.settings.headers,
            },
            body: JSON.stringify({
                model: this.modelId,
                input: {
                    query: params.query,
                    documents: params.documents,
                },
                parameters: {
                    return_documents: params.returnDocuments ?? false,
                    top_n: params.topN || params.documents.length,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`通义重排序请求失败: ${response.status} ${error}`);
        }

        const data = await response.json();
        if (data?.code) {
            throw new Error(`通义重排序服务错误: ${data.message || data.code}`);
        }

        const results = data?.output?.results ?? [];
        return {
            results: results.map((item: any) => ({
                index: item.index,
                relevanceScore: item.relevance_score,
                document: item.document?.text ?? item.document,
            })),
            model: data?.model || this.modelId,
        };
    }
}

export function createTongYiRerankModel(
    settings: TongYiProviderSettings,
    modelId: string,
): RerankModelV1 {
    return new TongYiRerankModel(settings, modelId);
}
