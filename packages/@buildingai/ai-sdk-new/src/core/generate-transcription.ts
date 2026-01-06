import type { TranscriptionModelV1, TranscriptionResult } from "../types";

export interface GenerateTranscriptionParams {
    model: TranscriptionModelV1;
    audio: ArrayBuffer | Blob | File;
    language?: string;
    prompt?: string;
    responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
    temperature?: number;
}

export async function generateTranscription(
    params: GenerateTranscriptionParams,
): Promise<TranscriptionResult> {
    const { model, audio, language, prompt, responseFormat, temperature } = params;
    return model.doTranscribe({
        audio,
        language,
        prompt,
        responseFormat,
        temperature,
    });
}
