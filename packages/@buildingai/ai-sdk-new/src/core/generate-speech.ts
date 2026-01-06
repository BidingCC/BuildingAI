import type { SpeechGenerateResult, SpeechModelV1 } from "../types";

export interface GenerateSpeechParams {
    model: SpeechModelV1;
    text: string;
    voice?: string;
    speed?: number;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

export async function generateSpeech(params: GenerateSpeechParams): Promise<SpeechGenerateResult> {
    const { model, text, voice, speed, responseFormat } = params;
    return model.doGenerate({
        text,
        voice,
        speed,
        responseFormat,
    });
}
