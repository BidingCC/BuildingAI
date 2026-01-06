import type { SpeechGenerateParams, SpeechGenerateResult, SpeechModelV1 } from "../../types";
import type { OpenAIProviderSettings } from "./index";

class OpenAISpeechModel implements SpeechModelV1 {
    readonly modelId: string;
    readonly provider = "openai";

    private settings: OpenAIProviderSettings;

    constructor(settings: OpenAIProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doGenerate(params: SpeechGenerateParams): Promise<SpeechGenerateResult> {
        const response = await fetch(`${this.settings.baseURL}/audio/speech`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
            body: JSON.stringify({
                model: this.modelId,
                input: params.text,
                voice: params.voice || "alloy",
                speed: params.speed || 1.0,
                response_format: params.responseFormat || "mp3",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI TTS 请求失败: ${response.status} ${error}`);
        }

        const audio = await response.arrayBuffer();

        return {
            audio,
            format: params.responseFormat || "mp3",
        };
    }
}

export function createOpenAISpeechModel(
    settings: OpenAIProviderSettings,
    modelId: string,
): SpeechModelV1 {
    return new OpenAISpeechModel(settings, modelId);
}
