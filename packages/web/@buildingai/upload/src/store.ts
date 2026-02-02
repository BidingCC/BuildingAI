import { defineStore } from "pinia";
import type { StorageTypeType } from "@buildingai/constants/shared";
import { apiGetUploadSignature } from "@buildingai/service/common";
import { apiGetActiveStorage } from "@buildingai/service/webapi/storage-config";

interface SignatureParams {
    name: string;
    size: number;
    extensionId?: string;
}

export const useStorageStore = defineStore("storage", {
    state: () => ({
        storageType: null as StorageTypeType | null,
    }),
    actions: {
        getOSSSignature(params: SignatureParams) {
            return apiGetUploadSignature(params);
        },

        updateStorageType(storageType: StorageTypeType) {
            this.storageType = storageType;
        },

        clearCache() {
            this.storageType = null;
        },

        async checkStorageType(): Promise<StorageTypeType> {
            if (this.storageType !== null) {
                return this.storageType;
            }

            const result = await apiGetActiveStorage();
            this.storageType = result.storageType;
            return result.storageType;
        },
    },
});
