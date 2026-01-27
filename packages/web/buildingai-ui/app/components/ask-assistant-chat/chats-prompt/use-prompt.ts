import type { FileUploadResponse } from "@buildingai/service/common";
import type { FilesList } from "@buildingai/service/models/message";
import { uploadFileAdaptive, uploadRemoteFileAdaptive } from "@buildingai/upload";

import { getMediaType } from "../../../utils/file";

export interface FileItem {
    id: string;
    name: string;
    size: number;
    url: string;
    progress: number;
    status: "uploading" | "success" | "error";
    /** Media type: image, video, audio, or regular file */
    mediaType: "image" | "video" | "audio" | "file";
    file?: File;
    result?: FileUploadResponse;
    error?: string;
}

export function usePromptFiles() {
    const { t } = useI18n();
    const toast = useMessage();
    const files = ref<FileItem[]>([]);

    const isUploading = computed(() => files.value.some((f) => f.status === "uploading"));
    const generateFileId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const findFileById = (id: string) => files.value.find((f) => f.id === id);

    const updateFileStatus = (id: string, updates: Partial<FileItem>) => {
        const file = findFileById(id);
        if (file) Object.assign(file, updates);
    };

    const revokeObjectUrl = (url: string) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };

    const uploadFile = async (file: File): Promise<FileUploadResponse | null> => {
        const fileId = generateFileId();
        const tempUrl = URL.createObjectURL(file);

        files.value.push({
            id: fileId,
            name: file.name,
            size: file.size,
            url: tempUrl,
            progress: 0,
            status: "uploading",
            mediaType: getMediaType(file),
            file,
        });

        try {
            const result = await uploadFileAdaptive(
                { file, description: `Prompt file: ${file.name}` },
                { onProgress: (percent) => updateFileStatus(fileId, { progress: percent }) },
            );

            revokeObjectUrl(tempUrl);
            updateFileStatus(fileId, {
                status: "success",
                progress: 100,
                url: result.url,
                result,
            });

            toast.success(t("common.message.uploadSuccess"));
            return result;
        } catch (error) {
            console.error("File upload failed:", error);
            updateFileStatus(fileId, {
                status: "error",
                error: error instanceof Error ? error.message : t("common.message.uploadFailed"),
            });
            toast.error(t("common.message.uploadFailed"));
            return null;
        }
    };

    const addUrl = async (url: string): Promise<boolean> => {
        try {
            new URL(url.trim());
        } catch {
            toast.error(t("common.message.invalidUrl"));
            return false;
        }

        const fileId = `url-${generateFileId()}`;
        const trimmedUrl = url.trim();
        const fileName = trimmedUrl.split("/").pop() || "Remote File";

        files.value.push({
            id: fileId,
            name: fileName,
            size: 0,
            url: trimmedUrl,
            progress: 0,
            status: "uploading",
            mediaType: "image", // Default to image, will be updated after upload
        });

        try {
            const result = await uploadRemoteFileAdaptive({
                url: trimmedUrl,
                description: `Remote file: ${fileName}`,
            });

            updateFileStatus(fileId, {
                status: "success",
                progress: 100,
                url: result.url,
                size: result.size,
                name: result.originalName,
                mediaType: getMediaType(result),
                result,
            });

            toast.success(t("common.message.urlAdded"));
            return true;
        } catch (error) {
            updateFileStatus(fileId, {
                status: "error",
                error: error instanceof Error ? error.message : t("common.message.uploadFailed"),
            });
            toast.error(t("common.message.uploadFailed"));
            return false;
        }
    };

    const removeFile = (file: FileItem) => {
        const index = files.value.findIndex((f) => f.id === file.id);
        if (index === -1) return;

        revokeObjectUrl(files.value[index]?.url ?? "");
        files.value.splice(index, 1);
    };

    const clearFiles = () => {
        files.value.forEach((f) => revokeObjectUrl(f.url));
        files.value = [];
    };

    const retryUpload = async (file: FileItem): Promise<FileUploadResponse | null> => {
        if (!file.file) {
            toast.error(t("common.message.fileNotFound"));
            return null;
        }

        Object.assign(file, { status: "uploading", progress: 0, error: undefined });

        try {
            const result = await uploadFileAdaptive(
                { file: file.file, description: `Prompt file: ${file.file.name}` },
                { onProgress: (percent) => (file.progress = percent) },
            );

            revokeObjectUrl(file.url);
            Object.assign(file, {
                status: "success",
                progress: 100,
                url: result.url,
                result,
            });

            toast.success(t("common.message.uploadSuccess"));
            return result;
        } catch (error) {
            console.error("File upload failed:", error);
            Object.assign(file, {
                status: "error",
                error: error instanceof Error ? error.message : t("common.message.uploadFailed"),
            });
            toast.error(t("common.message.uploadFailed"));
            return null;
        }
    };

    /**
     * Generate files list for AI message content
     * Converts uploaded files into appropriate format based on media type
     */
    const generateFilesList = (): FilesList => {
        return files.value
            .filter((f) => f.status === "success" && f.result)
            .map((f) => {
                switch (f.mediaType) {
                    case "image":
                        return {
                            type: "image_url" as const,
                            image_url: { url: f.url },
                        };
                    case "video":
                        return {
                            type: "video_url" as const,
                            video_url: { url: f.url },
                        };
                    case "audio": {
                        const extension = f.name.split(".").pop()?.toLowerCase() || "mp3";
                        return {
                            type: "input_audio" as const,
                            input_audio: {
                                data: f.url,
                                format: extension,
                            },
                        };
                    }
                    default:
                        return {
                            type: "file_url" as const,
                            name: f.name,
                            url: f.url,
                        };
                }
            });
    };

    return {
        files: readonly(files),
        isUploading,
        uploadFile,
        addUrl,
        removeFile,
        clearFiles,
        retryUpload,
        generateFilesList,
    };
}
