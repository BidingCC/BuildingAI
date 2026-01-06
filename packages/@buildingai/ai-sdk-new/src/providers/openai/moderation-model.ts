import type { ModerationModelV1, ModerationParams, ModerationResult } from "../../types";
import type { OpenAIProviderSettings } from "./index";

class OpenAIModerationModel implements ModerationModelV1 {
    readonly modelId: string;
    readonly provider = "openai";

    private settings: OpenAIProviderSettings;

    constructor(settings: OpenAIProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doModerate(params: ModerationParams): Promise<ModerationResult> {
        const response = await fetch(`${this.settings.baseURL}/moderations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
            body: JSON.stringify({
                model: this.modelId,
                input: params.input,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`内容审核请求失败: ${response.status} ${error}`);
        }

        const data = await response.json();

        return {
            results: data.results.map((result: any) => ({
                flagged: result.flagged,
                categories: result.categories,
                categoryScores: result.category_scores,
            })),
            model: data.model || this.modelId,
        };
    }
}

export function createOpenAIModerationModel(
    settings: OpenAIProviderSettings,
    modelId: string,
): ModerationModelV1 {
    return new OpenAIModerationModel(settings, modelId);
}
