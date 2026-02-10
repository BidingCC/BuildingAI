import type { JSONObject } from "@ai-sdk/provider";

export interface DeepSeekReasoningOptions {
    thinking?: boolean;
}

/**
 * Generate DeepSeek provider options for reasoning/thinking mode
 */
export function deepseekReasoning(options: DeepSeekReasoningOptions): Record<string, JSONObject> {
    return {
        deepseek: {
            thinking: { type: options.thinking ? "enabled" : "disabled" },
        },
    };
}
