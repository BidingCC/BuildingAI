import { apiUploadFile, type FileUploadResponse } from "@buildingai/service/common";
import { StorageType } from "@buildingai/constants/shared";

import type { FileUploadParams } from "../types";
import { useStorageStore } from "../store";
import { fileUploadToOSS } from "../engines/oss";
import { getExtensionId, omit } from "../utils";

async function uploadFileAdaptive(
    params: FileUploadParams,
    options?: { onProgress?: (percent: number) => void },
): Promise<FileUploadResponse> {
    const storageStore = useStorageStore();

    try {
        let storageType = storageStore.storageType;
        if (!storageType) {
            storageType = await storageStore.checkStorageType();
        }

        switch (storageType) {
            case StorageType.OSS: {
                const extensionId = getExtensionId(params.extensionId);
                return await fileUploadToOSS(
                    {
                        ...omit(params, "description"),
                        ...(extensionId && { extensionId }),
                        name: params.file.name,
                        size: params.file.size,
                    },
                    options,
                );
            }
            case StorageType.LOCAL:
                return await apiUploadFile(params, options);
        }

        return Promise.reject("Invalid storage type");
    } catch (error) {
        console.error("[Upload] upload failed:", error);
        throw error;
    }
}

export { uploadFileAdaptive };
