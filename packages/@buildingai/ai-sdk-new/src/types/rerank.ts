export interface RerankModelV1 {
    readonly modelId: string;
    readonly provider: string;
    doRerank(params: RerankParams): Promise<RerankResult>;
}

export interface RerankParams {
    query: string;
    documents: string[];
    topN?: number;
    returnDocuments?: boolean;
}

export interface RerankResult {
    results: RerankResultItem[];
    model: string;
    usage?: {
        totalTokens?: number;
    };
}

export interface RerankResultItem {
    index: number;
    relevanceScore: number;
    document?: string;
}
