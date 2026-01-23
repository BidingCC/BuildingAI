import type { JSONObject } from "@ai-sdk/provider";

export interface GoogleReasoningOptions {
    thinking?: boolean;
    thinkingBudget?: number;
    thinkingLevel?: "low" | "medium" | "high";
}

/**
 * Generate Google provider options for reasoning/thinking mode
 */
export function googleReasoning(options: GoogleReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        google: {
            thinkingConfig: {
                includeThoughts: true,
                thinkingBudget: options.thinkingBudget ?? 2048,
                thinkingLevel: options.thinkingLevel ?? "medium",
            },
        },
    };
}
