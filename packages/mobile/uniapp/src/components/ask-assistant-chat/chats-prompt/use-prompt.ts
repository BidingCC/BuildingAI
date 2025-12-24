import type { FilesList } from "@buildingai/service/models/message";

import { useUpload } from "@/hooks/use-request";
import type { FileUploadResponse } from "@/service/common";
import { apiUploadRemoteFile } from "@/service/common";
import { getMediaType } from "@/utils/file";

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
    const toast = useToast();
    const files = ref<FileItem[]>([]);

    const isUploading = computed(() => files.value.some((f) => f.status === "uploading"));
    const generateFileId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const findFileById = (id: string) => files.value.find((f) => f.id === id);

    const updateFileStatus = (id: string, updates: Partial<FileItem>) => {
        const index = files.value.findIndex((f) => f.id === id);
        if (index !== -1) {
            // Directly update the object to ensure reactivity
            const file = files.value[index];
            if (file) {
                Object.assign(file, updates);
                // Force reactivity update by reassigning the array
                files.value = [...files.value];
            }
        }
    };

    const uploadFile = async (file: File | string): Promise<FileUploadResponse | null> => {
        const fileId = generateFileId();
        // In uniapp, file can be a path string or File object
        const isPath = typeof file === "string";
        const filePath = isPath ? file : (file as File & { path?: string }).path || "";
        const fileName = isPath ? file.split("/").pop() || "file" : file.name;
        const fileSize = isPath ? 0 : file.size;

        // Determine media type
        let mediaType: "image" | "video" | "audio" | "file" = "file";
        if (isPath) {
            // Try to determine from file extension
            const ext = fileName.split(".").pop()?.toLowerCase() || "";
            if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext)) {
                mediaType = "image";
            } else if (["mp4", "webm", "ogg", "mov", "avi", "wmv", "flv", "mkv"].includes(ext)) {
                mediaType = "video";
            } else if (["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"].includes(ext)) {
                mediaType = "audio";
            }
        } else {
            mediaType = getMediaType(file);
        }

        files.value.push({
            id: fileId,
            name: fileName,
            size: fileSize,
            url: filePath, // Use path directly for preview in uniapp
            progress: 0,
            status: "uploading",
            mediaType,
            file: isPath ? undefined : file,
        });

        return new Promise<FileUploadResponse | null>((resolve) => {
            const uploadTask = useUpload<FileUploadResponse>({
                data: {
                    file: isPath ? file : filePath || file,
                    description: `Prompt file: ${fileName}`,
                },
                success: (result) => {
                    console.log("Upload success, updating file status:", fileId, result);
                    updateFileStatus(fileId, {
                        status: "success",
                        progress: 100,
                        url: result.url,
                        result,
                    });
                    console.log("File status after update:", findFileById(fileId));
                    toast.success(t("common.message.uploadSuccess"));
                    resolve(result);
                },
                fail: (errMsg) => {
                    console.error("File upload failed:", errMsg);
                    updateFileStatus(fileId, {
                        status: "error",
                        error: errMsg || t("common.message.uploadFailed"),
                    });
                    toast.error(t("common.message.uploadFailed"));
                    resolve(null);
                },
            });

            // Handle upload progress
            uploadTask.onProgressUpdate((res) => {
                const percent = res.progress || 0;
                updateFileStatus(fileId, { progress: percent });
            });
        });
    };

    const addUrl = async (url: string): Promise<boolean> => {
        // #ifndef MP
        try {
            new URL(url.trim());
        } catch {
            toast.error(t("common.message.invalidUrl"));
            return false;
        }
        // #endif

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
            const result = await apiUploadRemoteFile({
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
        files.value.splice(index, 1);
    };

    const clearFiles = () => {
        files.value = [];
    };

    const retryUpload = async (file: FileItem): Promise<FileUploadResponse | null> => {
        if (!file.file && !file.url) {
            toast.error(t("common.message.fileNotFound"));
            return null;
        }

        Object.assign(file, { status: "uploading", progress: 0, error: undefined });

        // Use file path if available, otherwise use file object
        const fileToUpload = file.url || file.file;
        const fileName = file.name;

        return new Promise<FileUploadResponse | null>((resolve) => {
            const uploadTask = useUpload<FileUploadResponse>({
                data: {
                    file: fileToUpload as File | string,
                    description: `Prompt file: ${fileName}`,
                },
                success: (result) => {
                    Object.assign(file, {
                        status: "success",
                        progress: 100,
                        url: result.url,
                        result,
                    });
                    toast.success(t("common.message.uploadSuccess"));
                    resolve(result);
                },
                fail: (errMsg) => {
                    console.error("File upload failed:", errMsg);
                    Object.assign(file, {
                        status: "error",
                        error: errMsg || t("common.message.uploadFailed"),
                    });
                    toast.error(t("common.message.uploadFailed"));
                    resolve(null);
                },
            });

            // Handle upload progress
            uploadTask.onProgressUpdate((res) => {
                const percent = res.progress || 0;
                file.progress = percent;
            });
        });
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
