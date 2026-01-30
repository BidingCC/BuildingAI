export const DATASETS_CONFIG_GROUP = "datasets_config";

export const DATASETS_CONFIG_KEYS = {
    INITIAL_STORAGE_MB: "initial_storage_mb",
    EMBEDDING_MODEL_ID: "embedding_model_id",
    RETRIEVAL_CONFIG: "retrieval_config",
} as const;

export const DATASETS_CONFIG_DEFAULT_RETRIEVAL = {
    TOP_K: 3,
    SCORE_THRESHOLD: 0.5,
    SEMANTIC_WEIGHT: 0.7,
    KEYWORD_WEIGHT: 0.3,
} as const;
