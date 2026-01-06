import type { RerankingModelV3, RerankingModelV3CallOptions } from "@ai-sdk/provider";

import type { RerankModelV1 } from "../types";

export function adaptRerankModelV1ToV3(model: RerankModelV1): RerankingModelV3 {
    return {
        specificationVersion: "v3",
        provider: model.provider,
        modelId: model.modelId,
        async doRerank(options: RerankingModelV3CallOptions) {
            const documents =
                options.documents.type === "text"
                    ? options.documents.values
                    : options.documents.values.map((doc) => JSON.stringify(doc));

            const result = await model.doRerank({
                query: options.query,
                documents,
                topN: options.topN,
                returnDocuments: false,
            });

            return {
                ranking: result.results.map((item) => ({
                    index: item.index,
                    relevanceScore: item.relevanceScore,
                })),
                providerMetadata: {},
            };
        },
    };
}
