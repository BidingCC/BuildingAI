import type { FileUploadResponse } from "@/service/common";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"] as const;
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "avi", "wmv", "flv", "mkv"] as const;
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"] as const;

interface FileLike {
    name?: string;
    originalName?: string;
    type?: string;
    extension?: string;
}

const extractExtension = (file: FileLike): string => {
    if (file.extension) return file.extension.toLowerCase();
    const filename = file.name || file.originalName || "";
    return filename.split(".").pop()?.toLowerCase() || "";
};

const matchesType = (
    file: FileLike,
    extensions: readonly string[],
    mimePrefix: string,
): boolean => {
    const extension = extractExtension(file);
    const type = file.type?.toLowerCase() || "";
    return extensions.includes(extension) || type.startsWith(mimePrefix);
};

export const isImageFile = (file: File | FileUploadResponse | FileLike): boolean => {
    return matchesType(file, IMAGE_EXTENSIONS, "image/");
};

export const isVideoFile = (file: File | FileUploadResponse | FileLike): boolean => {
    return matchesType(file, VIDEO_EXTENSIONS, "video/");
};

export const isAudioFile = (file: File | FileUploadResponse | FileLike): boolean => {
    return matchesType(file, AUDIO_EXTENSIONS, "audio/");
};

export const getMediaType = (
    file: File | FileUploadResponse | FileLike,
): "image" | "video" | "audio" | "file" => {
    if (isImageFile(file)) return "image";
    if (isVideoFile(file)) return "video";
    if (isAudioFile(file)) return "audio";
    return "file";
};

export const getFileExtensionFromName = (filename: string): string => {
    return filename.split(".").pop()?.toLowerCase() || "";
};
