import type { JSONObject } from "@ai-sdk/provider";

export interface CustomReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI-compatible provider options for reasoning/thinking mode
 */
export function customReasoning(options: CustomReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        openaiCompatible: {
            reasoningEffort: options.reasoningEffort ?? "medium",
        },
    };
}
