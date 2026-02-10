import type { JSONObject } from "@ai-sdk/provider";

export interface OpenRouterReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI-compatible provider options for reasoning/thinking mode
 */
export function openrouterReasoning(options: OpenRouterReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        openaiCompatible: {
            reasoningEffort: options.reasoningEffort ?? "medium",
        },
    };
}
