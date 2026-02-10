export type ModelType =
    | "LLM"
    | "MODERATION"
    | "RERANK"
    | "SPEECH_TO_TEXT"
    | "TEXT_EMBEDDING"
    | "TEXT_TO_IMAGE"
    | "TTS";

export const MODEL_TYPES: Record<ModelType, ModelType> = {
    LLM: "LLM",
    MODERATION: "MODERATION",
    RERANK: "RERANK",
    SPEECH_TO_TEXT: "SPEECH_TO_TEXT",
    TEXT_EMBEDDING: "TEXT_EMBEDDING",
    TEXT_TO_IMAGE: "TEXT_TO_IMAGE",
    TTS: "TTS",
};

export const MODEL_TYPE_DESCRIPTIONS: Record<ModelType, { name: string; description: string }> = {
    LLM: {
        name: "大语言模型",
        description: "文本生成、对话、推理等",
    },
    MODERATION: {
        name: "内容审核",
        description: "文本内容安全检测",
    },
    RERANK: {
        name: "重排序",
        description: "文档相关性重排序",
    },
    SPEECH_TO_TEXT: {
        name: "语音识别",
        description: "语音转文本 (STT)",
    },
    TEXT_EMBEDDING: {
        name: "文本嵌入",
        description: "文本向量化",
    },
    TEXT_TO_IMAGE: {
        name: "图像生成",
        description: "文本生成图像",
    },
    TTS: {
        name: "语音合成",
        description: "文本转语音 (TTS)",
    },
};

export function getAllModelTypes(): ModelType[] {
    return Object.keys(MODEL_TYPES) as ModelType[];
}

export function getModelTypesWithDescriptions(): Array<{
    type: ModelType;
    name: string;
    description: string;
}> {
    return getAllModelTypes().map((type) => ({
        type,
        ...MODEL_TYPE_DESCRIPTIONS[type],
    }));
}
