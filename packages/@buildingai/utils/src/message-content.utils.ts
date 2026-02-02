import type { MessageContent } from "@buildingai/types/ai/message-content.interface";

/**
 * File information extracted from message content
 */
export interface ExtractedFile {
    type: string;
    url: string;
}

/**
 * Extract text content from MessageContent
 * Used for scenarios that require plain text, such as knowledge base retrieval
 *
 * @param content - Message content, can be a string or array format
 * @returns Extracted text content
 */
export function extractTextFromMessageContent(content: MessageContent | undefined | null): string {
    if (!content) {
        return "";
    }

    // If it's a string, return directly
    if (typeof content === "string") {
        return content;
    }

    // If it's an array, extract all text parts
    if (Array.isArray(content)) {
        const textParts: string[] = [];

        for (const part of content) {
            // Extract text field
            if (part.text) {
                textParts.push(part.text);
            }
            // If type is "text", also extract text
            if (part.type === "text" && part.text) {
                textParts.push(part.text);
            }
        }

        return textParts.join(" ").trim();
    }

    return "";
}

/**
 * Extract files (images, audio, video, documents) from MessageContent
 * Used for third-party integrations like Dify and Coze that need file attachments
 *
 * @param content - Message content, can be a string or array format
 * @returns Array of extracted files with type and url
 */
export function extractFilesFromMessageContent(
    content: MessageContent | undefined | null,
): ExtractedFile[] {
    if (!content) {
        return [];
    }

    // If it's a string, no files
    if (typeof content === "string") {
        return [];
    }

    // If it's an array, extract all file parts
    if (Array.isArray(content)) {
        const files: ExtractedFile[] = [];

        for (const part of content) {
            // Handle image_url type
            if (part.type === "image_url" && part.image_url?.url) {
                files.push({
                    type: "image",
                    url: part.image_url.url,
                });
            }
            // Handle video_url type
            else if (part.type === "video_url" && part.video_url?.url) {
                files.push({
                    type: "video",
                    url: part.video_url.url,
                });
            }
            // Handle input_audio type
            else if (part.type === "input_audio" && part.input_audio?.data) {
                files.push({
                    type: "audio",
                    url: part.input_audio.data,
                });
            }
            // Handle file_url type (documents)
            else if (part.type === "file_url" && part.url) {
                files.push({
                    type: "document",
                    url: part.url,
                });
            }
        }

        return files;
    }

    return [];
}
