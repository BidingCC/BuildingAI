import type { RerankModelV1, RerankParams, RerankResult } from "../../types";
import type { TongYiProviderSettings } from "./index";

class TongYiRerankModel implements RerankModelV1 {
    readonly modelId: string;
    readonly provider = "tongyi";

    private settings: TongYiProviderSettings;

    constructor(settings: TongYiProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doRerank(params: RerankParams): Promise<RerankResult> {
        try {
            const requestBody = {
                model: this.modelId || "gte-rerank-v2",
                input: {
                    query: params.query,
                    documents: params.documents,
                },
                parameters: {
                    return_documents: false,
                    top_n: params.topN || params.documents.length,
                },
            };

            const response = await fetch(
                "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.settings.apiKey}`,
                        ...this.settings.headers,
                    },
                    body: JSON.stringify(requestBody),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `千问 rerank 请求失败: ${response.status} ${response.statusText} - ${errorText}`,
                );
            }

            const data = await response.json();

            if (data.code) {
                throw new Error(`千问 rerank 服务错误: ${data.message || data.code}`);
            }

            const results = data.output?.results || [];
            return {
                results: results.map((item: { index: number; relevance_score: number }) => ({
                    index: item.index,
                    relevanceScore: item.relevance_score,
                })),
                model: requestBody.model,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "未知错误";
            throw new Error(`千问 rerank 服务调用失败: ${errorMessage}`);
        }
    }
}

export function createTongYiRerankModel(
    settings: TongYiProviderSettings,
    modelId: string,
): RerankModelV1 {
    return new TongYiRerankModel(settings, modelId);
}
