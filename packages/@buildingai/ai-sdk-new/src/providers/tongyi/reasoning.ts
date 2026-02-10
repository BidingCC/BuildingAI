import type { JSONObject } from "@ai-sdk/provider";

export interface TongYiReasoningOptions {
    thinking?: boolean;
    thinkingBudget?: number;
}

/**
 * Generate OpenAI-compatible provider options for reasoning/thinking mode
 */
export function tongyiReasoning(options: TongYiReasoningOptions): Record<string, JSONObject> {
    return {
        tongyi: {
            enable_thinking: options.thinking ?? false,
            thinking_budget: options.thinkingBudget ?? 2048,
        },
    };
}
