import type {
    LanguageModelV3CallOptions,
    LanguageModelV3FilePart,
    LanguageModelV3Prompt,
    LanguageModelV3ReasoningPart,
    LanguageModelV3TextPart,
    LanguageModelV3ToolCallPart,
    LanguageModelV3ToolResultPart,
} from "@ai-sdk/provider";

const TONGYI_VIDEO_FLAG = "__tongyiVideoUrl";
const TONGYI_VIDEO_MEDIA_TYPE = "__tongyiVideoMediaType";

const VIDEO_MEDIA_TYPE_PREFIX = "video/";
const IMAGE_MEDIA_TYPE_FALLBACK = "image/*";

const VIDEO_SUPPORTED_URLS: Record<string, RegExp[]> = {
    "video/*": [/.*/],
};

const isVideoFilePart = (part: LanguageModelV3FilePart): boolean =>
    part.mediaType.startsWith(VIDEO_MEDIA_TYPE_PREFIX);

const shouldMarkAsVideoUrl = (part: LanguageModelV3FilePart): boolean => part.data instanceof URL;

const mergeSupportedUrls = (
    baseSupportedUrls: Record<string, RegExp[]>,
): Record<string, RegExp[]> => ({
    ...baseSupportedUrls,
    "video/*": [
        ...(baseSupportedUrls["video/*"] ?? []),
        ...(VIDEO_SUPPORTED_URLS["video/*"] ?? []),
    ],
});

const toVideoMarkerProviderOptions = (
    part: LanguageModelV3FilePart,
): LanguageModelV3FilePart["providerOptions"] => ({
    ...part.providerOptions,
    openaiCompatible: {
        ...(part.providerOptions?.openaiCompatible ?? {}),
        [TONGYI_VIDEO_FLAG]: true,
        [TONGYI_VIDEO_MEDIA_TYPE]: part.mediaType,
    },
});

const mapUserContent = (
    content: Array<LanguageModelV3FilePart | LanguageModelV3TextPart>,
): {
    content: Array<LanguageModelV3FilePart | LanguageModelV3TextPart>;
    didChange: boolean;
} => {
    let didChange = false;
    const mapped = content.map((part) => {
        if (part.type !== "file") {
            return part;
        }

        if (!isVideoFilePart(part) || !shouldMarkAsVideoUrl(part)) {
            return part;
        }

        didChange = true;
        return {
            ...part,
            mediaType: IMAGE_MEDIA_TYPE_FALLBACK,
            providerOptions: toVideoMarkerProviderOptions(part),
        };
    });

    return { content: mapped, didChange };
};

const mapAssistantContent = (
    content: Array<
        | LanguageModelV3FilePart
        | LanguageModelV3TextPart
        | LanguageModelV3ReasoningPart
        | LanguageModelV3ToolCallPart
        | LanguageModelV3ToolResultPart
    >,
): {
    content: Array<
        | LanguageModelV3FilePart
        | LanguageModelV3TextPart
        | LanguageModelV3ReasoningPart
        | LanguageModelV3ToolCallPart
        | LanguageModelV3ToolResultPart
    >;
    didChange: boolean;
} => {
    let didChange = false;
    const mapped = content.map((part) => {
        if (part.type !== "file") {
            return part;
        }

        if (!isVideoFilePart(part) || !shouldMarkAsVideoUrl(part)) {
            return part;
        }

        didChange = true;
        return {
            ...part,
            mediaType: IMAGE_MEDIA_TYPE_FALLBACK,
            providerOptions: toVideoMarkerProviderOptions(part),
        };
    });

    return { content: mapped, didChange };
};

export const transformTongyiPromptForVideo = (
    prompt: LanguageModelV3Prompt,
): LanguageModelV3Prompt =>
    prompt.map((message) => {
        switch (message.role) {
            case "system":
            case "tool":
                return message;
            case "user": {
                const { content, didChange } = mapUserContent(message.content);
                return didChange ? { ...message, content } : message;
            }
            case "assistant": {
                const { content, didChange } = mapAssistantContent(message.content);
                return didChange ? { ...message, content } : message;
            }
        }
    });

export const transformTongyiCallOptionsForVideo = (
    params: LanguageModelV3CallOptions,
): LanguageModelV3CallOptions => ({
    ...params,
    prompt: transformTongyiPromptForVideo(params.prompt),
});

export const transformTongyiRequestBody = (args: Record<string, any>): Record<string, any> => {
    if (!args || !Array.isArray(args.messages)) {
        return args;
    }

    const messages = args.messages.map((message: Record<string, any>) => {
        if (!Array.isArray(message.content)) {
            return message;
        }

        const content = message.content.map((part: Record<string, any>) => {
            if (part?.type !== "image_url" || part?.[TONGYI_VIDEO_FLAG] !== true) {
                return part;
            }

            const url = part?.image_url?.url;
            if (typeof url !== "string") {
                return part;
            }

            return {
                type: "video_url",
                video_url: { url },
            };
        });

        return { ...message, content };
    });

    console.log("messages", JSON.stringify(messages, null, 2));
    return { ...args, messages };
};

export const createTongyiSupportedUrls = async (
    baseSupportedUrls: PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>,
): Promise<Record<string, RegExp[]>> => mergeSupportedUrls(await baseSupportedUrls);
