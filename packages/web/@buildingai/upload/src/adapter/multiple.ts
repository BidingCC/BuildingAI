import { apiUploadFiles } from "@buildingai/service/common";
import { StorageType } from "@buildingai/constants/shared";
import { useStorageStore } from "../store";
import { filesUploadToOSS } from "../engines/oss";
import type { FilesUploadParams } from "../types";
import { getExtensionId, omit } from "../utils";

async function uploadFilesAdaptive(
    params: FilesUploadParams,
    options?: { onProgress?: (percent: number) => void },
) {
    const storageStore = useStorageStore();

    try {
        let storageType = storageStore.storageType;
        if (!storageType) {
            storageType = await storageStore.checkStorageType();
        }

        switch (storageType) {
            case StorageType.OSS: {
                const extensionId = getExtensionId(params.extensionId);
                return await filesUploadToOSS(
                    { ...omit(params, "description"), ...(extensionId && { extensionId }) },
                    options,
                );
            }
            case StorageType.LOCAL:
                return await apiUploadFiles(params, options);
        }

        return Promise.reject("Invalid storage type");
    } catch (error) {
        console.error("[Upload] upload failed:", error);
        throw error;
    }
}

export { uploadFilesAdaptive };
