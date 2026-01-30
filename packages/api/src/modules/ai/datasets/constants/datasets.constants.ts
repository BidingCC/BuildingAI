/**
 * 知识库服务常量（创建空知识库等默认配置）
 * 知识库字典配置（group/keys）在 Config 模块：constants/datasets-config.constants.ts
 */
export const DATASETS_DEFAULT_CONSTANTS = {
    DEFAULT_TOP_K: 3,
    DEFAULT_SCORE_THRESHOLD: 0.5,
    DEFAULT_SEMANTIC_WEIGHT: 0.7,
    DEFAULT_KEYWORD_WEIGHT: 0.3,
} as const;
