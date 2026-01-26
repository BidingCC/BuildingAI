import type { FileUploadResponse } from "@buildingai/service/common";
import { apiSaveOSSFileRecord } from "@buildingai/service/common";
import type {
    OssFilesUploadParams,
    OssFileUploadParams,
    OssWrappedFileUploadOptions,
} from "../types";
import { useStorageStore } from "../store";
import { getExtensionId } from "../utils";

async function fileUploadToOSS(
    { file, ...params }: OssFileUploadParams,
    options?: OssWrappedFileUploadOptions,
): Promise<FileUploadResponse> {
    const storageStore = useStorageStore();

    try {
        const { signature, fullPath, fileUrl, metadata } =
            await storageStore.getOSSSignature(params);

        const formData = new FormData();
        formData.append("key", fullPath);
        formData.append("success_action_status", "200");
        formData.append("policy", signature.policy);
        formData.append("x-oss-signature", signature.signature);
        formData.append("x-oss-signature-version", signature.ossSignatureVersion);
        formData.append("x-oss-credential", signature.ossCredential);
        formData.append("x-oss-date", signature.ossDate);
        formData.append("x-oss-security-token", signature.securityToken);
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            // progress
            if (options?.onProgress) {
                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        options.onProgress?.(percent, event.loaded);
                    }
                });
            }

            // listen complete
            xhr.addEventListener("load", async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        // Save file record to database after successful OSS upload
                        const extensionId = getExtensionId(params.extensionId);
                        const fileRecord = await apiSaveOSSFileRecord({
                            url: fileUrl,
                            originalName: metadata.originalName,
                            size: metadata.size,
                            extension: metadata.extension,
                            type: metadata.type,
                            path: fullPath,
                            extensionId,
                        });
                        resolve(fileRecord);
                    } catch (error) {
                        console.error("[Upload] Failed to save OSS file record:", error);
                        // Even if saving to database fails, return the upload result
                        // The file is already uploaded to OSS
                        resolve({
                            id: "",
                            type: metadata.type || "",
                            url: fileUrl,
                            originalName: metadata.originalName,
                            size: metadata.size,
                            extension: metadata.extension,
                        });
                    }
                } else {
                    const error = new Error(`OSS upload failed: ${xhr.status} ${xhr.statusText}`);
                    reject(error);
                }
            });

            // listen error
            xhr.addEventListener("error", () => {
                const error = new Error("OSS upload network error");
                reject(error);
            });

            // listen abort
            xhr.addEventListener("abort", () => {
                const error = new Error("OSS upload has been cancelled");
                reject(error);
            });

            // send
            xhr.open("POST", signature.host);
            xhr.send(formData);
        });
    } catch (error) {
        console.error("[Upload] OSS upload failed: ", error);
        throw error;
    }
}

async function filesUploadToOSS(
    params: OssFilesUploadParams,
    options?: OssWrappedFileUploadOptions,
) {
    const totalBytes = params.files.reduce((count, file) => count + file.size, 0);
    let uploadBytes = 0;

    const tasks = Promise.all(
        params.files.map((file) => {
            const fileParam: OssFileUploadParams = { file, size: file.size, name: file.name };
            if (params.extensionId) fileParam.extensionId = params.extensionId;

            const fileOptions: OssWrappedFileUploadOptions = {};
            if (options?.onProgress) {
                fileOptions.onProgress = (_: number, bytes) => {
                    uploadBytes += bytes;

                    const percent = Math.round((uploadBytes / totalBytes) * 100);
                    options.onProgress?.(Math.max(percent, 100), totalBytes);
                };
            }

            return fileUploadToOSS(fileParam);
        }),
    );

    return await tasks;
}

export { filesUploadToOSS, fileUploadToOSS };
