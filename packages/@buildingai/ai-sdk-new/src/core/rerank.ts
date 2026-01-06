import type { RerankModelV1, RerankResult } from "../types";

export interface RerankRequest {
    model: RerankModelV1;
    query: string;
    documents: string[];
    topN?: number;
    returnDocuments?: boolean;
}

export async function rerank(params: RerankRequest): Promise<RerankResult> {
    const { model, query, documents, topN, returnDocuments } = params;
    return model.doRerank({
        query,
        documents,
        topN,
        returnDocuments,
    });
}
