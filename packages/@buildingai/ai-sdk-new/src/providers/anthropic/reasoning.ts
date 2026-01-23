import type { JSONObject } from "@ai-sdk/provider";

export interface AnthropicReasoningOptions {
    thinking?: boolean;
    thinkingBudgetTokens?: number;
}

/**
 * Generate Anthropic provider options for reasoning/thinking mode
 */
export function anthropicReasoning(options: AnthropicReasoningOptions): Record<string, JSONObject> {
    if (options.thinking === undefined) {
        return {};
    }

    return {
        anthropic: options.thinking
            ? {
                  thinking: {
                      type: "enabled",
                      budget_tokens: options.thinkingBudgetTokens ?? 2048,
                  },
              }
            : {
                  thinking: { type: "disabled" },
              },
    };
}
