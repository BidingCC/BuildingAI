export interface EmbeddingResult {
    embedding: number[];
    usage?: {
        tokens: number;
    };
}

export interface EmbedManyResult {
    embeddings: number[][];
    usage?: {
        tokens: number;
    };
}

export interface EmbeddingParams {
    value: string;
    dimensions?: number;
}

export interface EmbedManyParams {
    values: string[];
    dimensions?: number;
}
