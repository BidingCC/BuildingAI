import type { TranscriptionModelV1, TranscriptionParams, TranscriptionResult } from "../../types";
import type { OpenAIProviderSettings } from "./index";

class OpenAITranscriptionModel implements TranscriptionModelV1 {
    readonly modelId: string;
    readonly provider = "openai";

    private settings: OpenAIProviderSettings;

    constructor(settings: OpenAIProviderSettings, modelId: string) {
        this.settings = settings;
        this.modelId = modelId;
    }

    async doTranscribe(params: TranscriptionParams): Promise<TranscriptionResult> {
        const formData = new FormData();

        if (params.audio instanceof ArrayBuffer) {
            const blob = new Blob([params.audio], { type: "audio/mpeg" });
            formData.append("file", blob, "audio.mp3");
        } else {
            formData.append("file", params.audio);
        }

        formData.append("model", this.modelId);

        if (params.language) {
            formData.append("language", params.language);
        }

        if (params.prompt) {
            formData.append("prompt", params.prompt);
        }

        if (params.responseFormat) {
            formData.append("response_format", params.responseFormat);
        }

        if (params.temperature !== undefined) {
            formData.append("temperature", params.temperature.toString());
        }

        const response = await fetch(`${this.settings.baseURL}/audio/transcriptions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.settings.apiKey}`,
                ...this.settings.headers,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI STT 请求失败: ${response.status} ${error}`);
        }

        const data = await response.json();

        return {
            text: data.text,
            language: data.language,
            duration: data.duration,
            segments: data.segments?.map((seg: any) => ({
                id: seg.id,
                start: seg.start,
                end: seg.end,
                text: seg.text,
            })),
        };
    }
}

export function createOpenAITranscriptionModel(
    settings: OpenAIProviderSettings,
    modelId: string,
): TranscriptionModelV1 {
    return new OpenAITranscriptionModel(settings, modelId);
}
