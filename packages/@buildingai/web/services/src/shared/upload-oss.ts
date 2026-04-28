import { useAuthStore } from "@buildingai/stores";
import axios, { type AxiosProgressEvent } from "axios";

import { apiHttpClient } from "../base";
import {
    uploadFile,
    type UploadFileParams,
    type UploadFileResult,
    uploadFiles,
    type UploadRequestOptions,
} from "./upload";

type ActiveStorageConfig = {
    id: string;
    storageType: string;
    isActive: boolean;
};

let storageConfigCache: ActiveStorageConfig | null = null;
let pendingStorageRequest: Promise<ActiveStorageConfig> | null = null;

// 退出登录时自动失效缓存
useAuthStore.subscribe((state) => {
    if (!state.auth.token) {
        storageConfigCache = null;
    }
});

/**
 * 清除存储配置缓存
 */
export function invalidateStorageConfigCache() {
    storageConfigCache = null;
}

async function getActiveStorageConfig(): Promise<ActiveStorageConfig> {
    if (storageConfigCache) return storageConfigCache;

    if (!pendingStorageRequest) {
        pendingStorageRequest = apiHttpClient
            .get<ActiveStorageConfig>("/storage-config/active")
            .then((result) => {
                storageConfigCache = result;
                pendingStorageRequest = null;
                return result;
            })
            .catch((err) => {
                pendingStorageRequest = null;
                throw err;
            });
    }

    return pendingStorageRequest;
}

type OSSSignature = {
    signature: string;
    ossSignatureVersion: string;
    policy: string;
    ossCredential: string;
    ossDate: string;
    host: string;
    bucket: string;
    securityToken: string;
};

type COSSignature = {
    authorization: string;
    host: string;
    bucket: string;
    region: string;
    securityToken: string;
    tmpSecretId: string;
    startTime: number;
    expiredTime: number;
};

type OSSFileMetadata = {
    type: string;
    mimeType: string;
    extension: string;
    originalName: string;
    size: number;
};

export type OSSSignatureResult = {
    signature: OSSSignature;
    metadata: OSSFileMetadata;
    storageType: "oss";
    fullPath: string;
    fileUrl: string;
};

export type COSSignatureResult = {
    signature: COSSignature;
    metadata: OSSFileMetadata;
    storageType: "cos";
    fullPath: string;
    fileUrl: string;
};

export type LocalSignatureResult = {
    signature: null;
    storageType: Exclude<string, "oss" | "cos">;
};

export type SignatureResult = OSSSignatureResult | COSSignatureResult | LocalSignatureResult;

export function isCloudSignatureResult(
    result: SignatureResult,
): result is OSSSignatureResult | COSSignatureResult {
    return result.signature !== null;
}

export async function getUploadSignature(
    name: string,
    size: number,
    extensionId?: string,
): Promise<SignatureResult> {
    return apiHttpClient.post<SignatureResult>("/upload/signature", { name, size, extensionId });
}

export async function uploadToOSS(
    file: File,
    result: OSSSignatureResult,
    onUploadProgress?: (event: AxiosProgressEvent) => void,
): Promise<void> {
    const { signature, fullPath } = result;

    const formData = new FormData();
    formData.append("key", fullPath);
    formData.append("x-oss-credential", signature.ossCredential);
    formData.append("x-oss-date", signature.ossDate);
    formData.append("x-oss-signature-version", signature.ossSignatureVersion);
    formData.append("x-oss-security-token", signature.securityToken);
    formData.append("policy", signature.policy);
    formData.append("x-oss-signature", signature.signature);
    formData.append("Content-Type", file.type || "application/octet-stream");
    formData.append("file", file);

    await axios.post(signature.host, formData, { onUploadProgress });
}
export async function uploadToCOS(
    file: File,
    result: COSSignatureResult,
    onUploadProgress?: (event: AxiosProgressEvent) => void,
): Promise<void> {
    const { signature, fullPath } = result;
    const normalizedHost = signature.host.endsWith("/")
        ? signature.host.slice(0, -1)
        : signature.host;
    const uploadUrl = `${normalizedHost}/${fullPath}`;
    await axios.put(uploadUrl, file, {
        onUploadProgress,
        headers: {
            Authorization: signature.authorization,
            "x-cos-security-token": signature.securityToken,
            "Content-Type": file.type || "application/octet-stream",
        },
    });
}

export async function saveOSSFileRecord(params: {
    url: string;
    originalName: string;
    size: number;
    extension?: string;
    type?: string;
    description?: string;
    extensionId?: string;
    path?: string;
}): Promise<UploadFileResult> {
    return apiHttpClient.post<UploadFileResult>("/upload/oss-file", params);
}

export async function uploadFileAuto(
    file: File,
    params?: UploadFileParams,
    options?: UploadRequestOptions,
): Promise<UploadFileResult> {
    const storageConfig = await getActiveStorageConfig();

    if (storageConfig.storageType === "local") {
        return uploadFile(file, params, options);
    }

    const signatureResult = await getUploadSignature(file.name, file.size, params?.extensionId);

    if (!isCloudSignatureResult(signatureResult)) {
        throw new Error("No signature");
    }
    switch (storageConfig.storageType) {
        case "oss":
            if (signatureResult.storageType !== "oss") {
                throw new Error("Invalid OSS signature");
            }
            await uploadToOSS(file, signatureResult, options?.onUploadProgress);
            break;
        case "cos":
            if (signatureResult.storageType !== "cos") {
                throw new Error("Invalid COS signature");
            }
            await uploadToCOS(file, signatureResult, options?.onUploadProgress);
            break;
        default:
            throw new Error(`Unsupported storage type: ${storageConfig.storageType}`);
    }

    return saveOSSFileRecord({
        url: signatureResult.fileUrl,
        originalName: file.name,
        size: file.size,
        extension: signatureResult.metadata.extension,
        type: signatureResult.metadata.mimeType,
        description: params?.description,
        extensionId: params?.extensionId,
        path: signatureResult.fullPath,
    });
}

export async function uploadFilesAuto(
    files: File[],
    params?: UploadFileParams,
    options?: UploadRequestOptions,
): Promise<UploadFileResult[]> {
    const storageConfig = await getActiveStorageConfig();

    if (storageConfig.storageType !== "oss") {
        return uploadFiles(files, params, options);
    }

    return Promise.all(files.map((file) => uploadFileAuto(file, params)));
}
