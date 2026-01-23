import type { JSONObject } from "@ai-sdk/provider";

export interface SparkReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI-compatible provider options for reasoning/thinking mode
 */
export function sparkReasoning(options: SparkReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        openaiCompatible: {
            reasoningEffort: options.reasoningEffort ?? "medium",
        },
    };
}
