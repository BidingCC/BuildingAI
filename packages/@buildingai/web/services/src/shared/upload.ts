import { apiHttpClient } from "../base";

export type UploadFileResult = {
    id: string;
    url: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
};

export type UploadFileParams = {
    description?: string;
    extensionId?: string;
};

export async function uploadFile(file: File, params?: UploadFileParams): Promise<UploadFileResult> {
    const formData = new FormData();
    formData.append("file", file);
    if (params?.description) {
        formData.append("description", params.description);
    }
    if (params?.extensionId) {
        formData.append("extensionId", params.extensionId);
    }

    return apiHttpClient.post<UploadFileResult>("/upload/file", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
}

export async function uploadFiles(
    files: File[],
    params?: UploadFileParams,
): Promise<UploadFileResult[]> {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });
    if (params?.description) {
        formData.append("description", params.description);
    }
    if (params?.extensionId) {
        formData.append("extensionId", params.extensionId);
    }

    return apiHttpClient.post<UploadFileResult[]>("/upload/files", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
}

export function detectFileType(mimeType: string): "image" | "video" | "file" {
    if (mimeType.startsWith("image/")) {
        return "image";
    }
    if (mimeType.startsWith("video/")) {
        return "video";
    }
    return "file";
}
