import type { JSONObject } from "@ai-sdk/provider";

export interface ZhipuAIReasoningOptions {
    thinking?: boolean;
}

export function zhipuaiReasoning(options: ZhipuAIReasoningOptions): Record<string, JSONObject> {
    return {
        zhipu: {
            thinking: {
                type: options.thinking ? "enabled" : "disabled",
            },
        },
    };
}
