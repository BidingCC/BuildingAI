export interface ImageModelV1 {
    readonly modelId: string;
    readonly provider: string;
    doGenerate(params: ImageGenerateParams): Promise<ImageGenerateResult>;
}

export interface ImageGenerateParams {
    prompt: string;
    negativePrompt?: string;
    n?: number;
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" | string;
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    responseFormat?: "url" | "b64_json";
}

export interface ImageGenerateResult {
    images: GeneratedImage[];
}

export interface GeneratedImage {
    url?: string;
    b64Json?: string;
    revisedPrompt?: string;
}
