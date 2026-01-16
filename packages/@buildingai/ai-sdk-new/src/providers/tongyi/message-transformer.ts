import type {
    InputContentPart,
    InputFilePart,
    MessageContent,
    TransformedContentPart,
    TransformedMessage,
    TransformedMessageContent,
} from "./types";

function transformContentPart(part: InputContentPart): TransformedContentPart {
    if (part.type === "file") {
        const filePart = part as InputFilePart;
        const url = filePart.url || filePart.data;

        if (!url) {
            return part as TransformedContentPart;
        }

        if (filePart.mediaType?.startsWith("video/")) {
            return {
                type: "video_url",
                video_url: {
                    url: url,
                },
            };
        }

        if (filePart.mediaType?.startsWith("image/")) {
            return {
                type: "image_url",
                image_url: {
                    url: url,
                },
            };
        }

        if (filePart.mediaType?.startsWith("audio/")) {
            const format = filePart.mediaType.split("/")[1] || "mp3";
            return {
                type: "input_audio",
                input_audio: {
                    data: url,
                    format: format,
                },
            };
        }

        return {
            type: "file_url",
            url: url,
            name: filePart.filename || filePart.name,
        };
    }

    return part as TransformedContentPart;
}

export function transformMessageContent(content: MessageContent): TransformedMessageContent {
    if (typeof content === "string") {
        return content;
    }

    if (Array.isArray(content)) {
        return content.map((part) => transformContentPart(part));
    }

    return content as TransformedMessageContent;
}

export function transformMessages(
    messages: Array<{ content?: MessageContent; [key: string]: unknown }>,
): TransformedMessage[] {
    return messages.map((message) => {
        if (message.content) {
            return {
                ...message,
                content: transformMessageContent(message.content),
            } as TransformedMessage;
        }
        return message as TransformedMessage;
    });
}
