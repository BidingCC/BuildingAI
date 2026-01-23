import { anthropicReasoning } from "./anthropic/reasoning";
import { azureReasoning } from "./azure/reasoning";
import { customReasoning } from "./custom/reasoning";
import { deepseekReasoning } from "./deepseek/reasoning";
import { giteeAiReasoning } from "./gitee-ai/reasoning";
import { googleReasoning } from "./google/reasoning";
import { hunyuanReasoning } from "./hunyuan/reasoning";
import { moonshotReasoning } from "./moonshot/reasoning";
import { openaiReasoning } from "./openai/reasoning";
import { openrouterReasoning } from "./openrouter/reasoning";
import { siliconflowReasoning } from "./siliconflow/reasoning";
import { sparkReasoning } from "./spark/reasoning";
import { tongyiReasoning } from "./tongyi/reasoning";
import { volcengineReasoning } from "./volcengine/reasoning";
import { wenxinReasoning } from "./wenxin/reasoning";
import { zhipuaiReasoning } from "./zhipuai/reasoning";

export function getReasoningOptions(
    providerId: string,
    options: { thinking?: boolean },
): Record<string, any> {
    const { thinking } = options;

    switch (providerId) {
        case "openai":
            return openaiReasoning({ thinking });
        case "anthropic":
            return anthropicReasoning({ thinking });
        case "google":
            return googleReasoning({ thinking });
        case "deepseek":
            return deepseekReasoning({ thinking });
        case "azure":
            return azureReasoning({ thinking });
        case "custom":
            return customReasoning({ thinking });
        case "tongyi":
            return tongyiReasoning({ thinking });
        case "moonshot":
            return moonshotReasoning({ thinking });
        case "siliconflow":
            return siliconflowReasoning({ thinking });
        case "volcengine":
            return volcengineReasoning({ thinking });
        case "spark":
            return sparkReasoning({ thinking });
        case "gitee_ai":
            return giteeAiReasoning({ thinking });
        case "hunyuan":
            return hunyuanReasoning({ thinking });
        case "wenxin":
            return wenxinReasoning({ thinking });
        case "openrouter":
            return openrouterReasoning({ thinking });
        case "zhipuai":
            return zhipuaiReasoning({ thinking });
        default:
            return {};
    }
}
