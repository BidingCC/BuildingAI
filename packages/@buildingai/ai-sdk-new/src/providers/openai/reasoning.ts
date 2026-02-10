import type { JSONObject } from "@ai-sdk/provider";

export interface OpenAIReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI provider options for reasoning/thinking mode
 */
export function openaiReasoning(options: OpenAIReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        openai: {
            reasoningEffort: options.reasoningEffort ?? "medium",
        },
    };
}

/**
 * Generate OpenAI provider options for reasoning/thinking mode (alias for openaiReasoning)
 */
export const openaiReasoningForModel = openaiReasoning;
