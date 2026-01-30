/**
 * 文档处理模式常量（分段配置，仅 datasets-old 使用）
 */
export const DOCUMENT_MODE = {
    NORMAL: "normal",
    HIERARCHICAL: "hierarchical",
} as const;

/**
 * 父块上下文模式常量（分段配置，仅 datasets-old 使用）
 */
export const PARENT_CONTEXT_MODE = {
    FULL_TEXT: "fullText",
    PARAGRAPH: "paragraph",
} as const;

export const RAG_SERVICE_CONSTANTS = {
    // Batch size for processing
    BATCH_SIZE: 10,

    // Default topK for retrieval
    DEFAULT_TOP_K: 3,

    // Default score threshold
    DEFAULT_SCORE_THRESHOLD: 0.5,

    // Default weights for hybrid retrieval
    DEFAULT_SEMANTIC_WEIGHT: 0.7,
    DEFAULT_KEYWORD_WEIGHT: 0.3,

    // Floating point tolerance when validating weight sum
    WEIGHT_SUM_TOLERANCE: 0.01,

    // Default strategies
    DEFAULT_HYBRID_STRATEGY: "weighted_score",
    RERANK_STRATEGY: "rerank",

    // Score normalization multipliers
    /** Full-text search score normalization factor */
    FULLTEXT_SCORE_MULTIPLIER: 100,
    /** Vector search score normalization factor (cosine similarity is already 0-1) */
    VECTOR_SCORE_MULTIPLIER: 1,

    // Hybrid search candidate multiplier
    /** Multiplier for candidate count in hybrid search */
    HYBRID_CANDIDATE_MULTIPLIER: 2,
    /** Minimum candidates for hybrid search */
    HYBRID_MIN_CANDIDATES: 10,
} as const;
