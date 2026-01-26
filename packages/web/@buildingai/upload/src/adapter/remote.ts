import { apiUploadRemoteFile } from "@buildingai/service/common";
import { StorageType } from "@buildingai/constants/shared";
import { fileUploadToOSS } from "../engines/oss";
import { useStorageStore } from "../store";

async function uploadRemoteFileAdaptive(params: { url: string; description?: string }) {
    const storageStore = useStorageStore();

    try {
        let storageType = storageStore.storageType;
        if (!storageType) {
            storageType = await storageStore.checkStorageType();
        }

        switch (storageType) {
            case StorageType.OSS: {
                const response = await fetch(params.url);
                const file = await response.blob();

                const getFileNameFromUrl = (url: string) => {
                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname;
                    return pathname.substring(pathname.lastIndexOf("/") + 1);
                };
                return await fileUploadToOSS({
                    file,
                    size: file.size,
                    name: getFileNameFromUrl(params.url),
                });
            }
            case StorageType.LOCAL:
                return apiUploadRemoteFile(params);
        }

        return Promise.reject("Invalid storage type");
    } catch (error) {
        console.error("[Upload] upload failed:", error);
        throw error;
    }
}

export { uploadRemoteFileAdaptive };
