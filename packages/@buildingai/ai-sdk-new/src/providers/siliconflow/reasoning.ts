import type { JSONObject } from "@ai-sdk/provider";

export interface SiliconFlowReasoningOptions {
    thinking?: boolean;
    thinkingBudget?: number;
}

/**
 * Generate SiliconFlow provider options for reasoning/thinking mode
 * enable_thinking and thinking_budget are root-level parameters (same level as messages)
 */
export function siliconflowReasoning(
    options: SiliconFlowReasoningOptions,
): Record<string, JSONObject> {
    return {
        siliconflow: {
            enable_thinking: options.thinking,
        },
    };
}
