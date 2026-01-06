export type ProviderCapability =
    | "language"
    | "embedding"
    | "speech"
    | "transcription"
    | "image"
    | "moderation"
    | "rerank";

export const PROVIDER_CAPABILITIES: Record<
    ProviderCapability,
    { name: string; description: string }
> = {
    language: {
        name: "Language Model",
        description: "文本生成、对话、推理等",
    },
    embedding: {
        name: "Embedding Model",
        description: "文本向量化、语义搜索",
    },
    speech: {
        name: "Speech Synthesis (TTS)",
        description: "文本转语音",
    },
    transcription: {
        name: "Speech Recognition (STT)",
        description: "语音转文本",
    },
    image: {
        name: "Image Generation",
        description: "图像生成、编辑",
    },
    moderation: {
        name: "Content Moderation",
        description: "内容审核、安全检测",
    },
    rerank: {
        name: "Document Reranking",
        description: "文档重排序、相关性评分",
    },
};

export interface ProviderCapabilities {
    supported: ProviderCapability[];
    supports(capability: ProviderCapability): boolean;
    getAll(): Record<ProviderCapability, boolean>;
}

export function createCapabilities(supported: ProviderCapability[]): ProviderCapabilities {
    const supportedSet = new Set(supported);

    return {
        supported,
        supports(capability: ProviderCapability): boolean {
            return supportedSet.has(capability);
        },
        getAll(): Record<ProviderCapability, boolean> {
            return {
                language: supportedSet.has("language"),
                embedding: supportedSet.has("embedding"),
                speech: supportedSet.has("speech"),
                transcription: supportedSet.has("transcription"),
                image: supportedSet.has("image"),
                moderation: supportedSet.has("moderation"),
                rerank: supportedSet.has("rerank"),
            };
        },
    };
}
