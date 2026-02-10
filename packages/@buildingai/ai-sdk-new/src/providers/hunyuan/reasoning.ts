import type { JSONObject } from "@ai-sdk/provider";

export interface HunyuanReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI-compatible provider options for reasoning/thinking mode
 */
export function hunyuanReasoning(options: HunyuanReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        openaiCompatible: {
            reasoningEffort: options.reasoningEffort ?? "medium",
        },
    };
}
