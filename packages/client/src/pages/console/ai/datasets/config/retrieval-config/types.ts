export type RetrievalConfig = {
  retrievalMode: string;
  strategy?: "weighted_score" | "rerank";
  topK?: number;
  scoreThreshold?: number;
  scoreThresholdEnabled?: boolean;
  weightConfig?: { semanticWeight?: number; keywordWeight?: number };
  rerankConfig?: { enabled?: boolean; modelId?: string };
};

export function buildEmptyRetrievalConfig(mode: string): RetrievalConfig {
  return {
    retrievalMode: mode,
    strategy: "weighted_score",
    topK: 3,
    scoreThreshold: 0.5,
    scoreThresholdEnabled: false,
    weightConfig: { semanticWeight: 0.7, keywordWeight: 0.3 },
    rerankConfig: { enabled: false, modelId: "" },
  };
}
