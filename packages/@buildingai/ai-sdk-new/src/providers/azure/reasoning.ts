import type { JSONObject } from "@ai-sdk/provider";

export interface AzureReasoningOptions {
    thinking?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Generate OpenAI provider options for reasoning/thinking mode (Azure uses OpenAI format)
 */
export function azureReasoning(options: AzureReasoningOptions): Record<string, JSONObject> {
    if (!options.thinking) {
        return {};
    }

    return {
        openai: {
            reasoningEffort: options.reasoningEffort ?? "medium",
        },
    };
}
