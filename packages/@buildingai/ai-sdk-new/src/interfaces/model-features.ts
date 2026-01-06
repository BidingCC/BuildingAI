export type ModelFeatureType =
    | "AGENT_THOUGHT"
    | "AUDIO"
    | "DOCUMENT"
    | "MULTI_TOOL_CALL"
    | "STREAM_TOOL_CALL"
    | "STRUCTURED_OUTPUT"
    | "TOOL_CALL"
    | "VIDEO"
    | "VISION";

export const MODEL_FEATURES: Record<ModelFeatureType, ModelFeatureType> = {
    AGENT_THOUGHT: "AGENT_THOUGHT",
    AUDIO: "AUDIO",
    DOCUMENT: "DOCUMENT",
    MULTI_TOOL_CALL: "MULTI_TOOL_CALL",
    STREAM_TOOL_CALL: "STREAM_TOOL_CALL",
    STRUCTURED_OUTPUT: "STRUCTURED_OUTPUT",
    TOOL_CALL: "TOOL_CALL",
    VIDEO: "VIDEO",
    VISION: "VISION",
};

export const MODEL_FEATURE_DESCRIPTIONS: Record<
    ModelFeatureType,
    { name: string; description: string }
> = {
    AGENT_THOUGHT: {
        name: "Agent 思考",
        description: "支持 Agent 思考过程可见化",
    },
    AUDIO: {
        name: "音频",
        description: "支持音频输入/输出",
    },
    DOCUMENT: {
        name: "文档",
        description: "支持文档解析和理解",
    },
    MULTI_TOOL_CALL: {
        name: "多工具调用",
        description: "支持同时调用多个工具",
    },
    STREAM_TOOL_CALL: {
        name: "流式工具调用",
        description: "支持流式返回工具调用结果",
    },
    STRUCTURED_OUTPUT: {
        name: "结构化输出",
        description: "支持 JSON Schema 等结构化输出格式",
    },
    TOOL_CALL: {
        name: "工具调用",
        description: "支持函数/工具调用",
    },
    VIDEO: {
        name: "视频",
        description: "支持视频输入理解",
    },
    VISION: {
        name: "视觉",
        description: "支持图像输入理解",
    },
};

export function getAllModelFeatures(): ModelFeatureType[] {
    return Object.keys(MODEL_FEATURES) as ModelFeatureType[];
}

export function getModelFeaturesWithDescriptions(): Array<{
    type: ModelFeatureType;
    name: string;
    description: string;
}> {
    return getAllModelFeatures().map((type) => ({
        type,
        ...MODEL_FEATURE_DESCRIPTIONS[type],
    }));
}
