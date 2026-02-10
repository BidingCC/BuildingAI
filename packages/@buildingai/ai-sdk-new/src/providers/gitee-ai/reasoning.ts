import type { JSONObject } from "@ai-sdk/provider";

export interface GiteeAIReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI-compatible provider options for reasoning/thinking mode
 */
export function giteeAiReasoning(options: GiteeAIReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        gitee_ai: {
            enable_thinking: options.thinking,
        },
    };
}
