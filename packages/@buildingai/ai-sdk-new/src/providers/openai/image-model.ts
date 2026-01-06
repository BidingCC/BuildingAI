import type { ImageGenerateParams, ImageGenerateResult, ImageModelV1 } from "../../types";
import type { OpenAIProviderSettings } from "./index";

class OpenAIImageModel implements ImageModelV1 {
    readonly modelId: string;
    readonly provider = "openai";

    private settings: OpenAIProviderSettings;

    constructor(settings: OpenAIProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doGenerate(params: ImageGenerateParams): Promise<ImageGenerateResult> {
        const response = await fetch(`${this.settings.baseURL}/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
            body: JSON.stringify({
                model: this.modelId,
                prompt: params.prompt,
                n: params.n || 1,
                size: params.size || "1024x1024",
                quality: params.quality || "standard",
                style: params.style || "vivid",
                response_format: params.responseFormat || "url",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`图像生成请求失败: ${response.status} ${error}`);
        }

        const data = await response.json();

        return {
            images: data.data.map((img: any) => ({
                url: img.url,
                b64Json: img.b64_json,
                revisedPrompt: img.revised_prompt,
            })),
        };
    }
}

export function createOpenAIImageModel(
    settings: OpenAIProviderSettings,
    modelId: string,
): ImageModelV1 {
    return new OpenAIImageModel(settings, modelId);
}
