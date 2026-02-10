import type { JSONObject } from "@ai-sdk/provider";

export interface WenXinReasoningOptions {
    thinking?: boolean;
}

export function wenxinReasoning(options: WenXinReasoningOptions): Record<string, JSONObject> {
    return {
        wenxin: {
            enable_reasoning: options.thinking ?? false,
        },
    };
}
