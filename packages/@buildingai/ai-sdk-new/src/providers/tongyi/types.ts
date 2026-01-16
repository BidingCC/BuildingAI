export interface MessageContentPart {
    type: string;
    text?: string;
    image_url?: {
        url: string;
        detail?: "auto" | "low" | "high";
    };
    input_audio?: { data: string; format: string };
    video_url?: { url: string };
    url?: string;
    name?: string;
    [key: string]: unknown;
}

export interface InputFilePart {
    type: "file";
    mediaType?: string;
    filename?: string;
    name?: string;
    url?: string;
    data?: string;
}

export interface InputTextPart {
    type: "text";
    text: string;
}

export type InputContentPart = InputFilePart | InputTextPart | MessageContentPart;

export interface TransformedVideoUrlPart {
    type: "video_url";
    video_url: {
        url: string;
    };
}

export interface TransformedImageUrlPart {
    type: "image_url";
    image_url: {
        url: string;
    };
}

export interface TransformedInputAudioPart {
    type: "input_audio";
    input_audio: {
        data: string;
        format: string;
    };
}

export interface TransformedFileUrlPart {
    type: "file_url";
    url: string;
    name?: string;
}

export type TransformedContentPart =
    | InputTextPart
    | TransformedVideoUrlPart
    | TransformedImageUrlPart
    | TransformedInputAudioPart
    | TransformedFileUrlPart
    | MessageContentPart
    | { [key: string]: unknown };

export type MessageContent = string | InputContentPart[];

export type TransformedMessageContent = string | TransformedContentPart[];

export interface Message {
    role: "user" | "assistant" | "system" | "tool";
    content: MessageContent;
    [key: string]: unknown;
}

export interface TransformedMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: TransformedMessageContent;
    [key: string]: unknown;
}
