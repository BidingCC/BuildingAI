import type { ImageGenerateResult, ImageModelV1 } from "../types";

export interface GenerateImageParams {
    model: ImageModelV1;
    prompt: string;
    negativePrompt?: string;
    n?: number;
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" | string;
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    responseFormat?: "url" | "b64_json";
}

export async function generateImage(params: GenerateImageParams): Promise<ImageGenerateResult> {
    const { model, prompt, negativePrompt, n, size, quality, style, responseFormat } = params;
    return model.doGenerate({
        prompt,
        negativePrompt,
        n,
        size,
        quality,
        style,
        responseFormat,
    });
}
