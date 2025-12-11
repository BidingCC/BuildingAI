import type {
    StorageConfigMap,
    StorageTypeType,
} from "@buildingai/constants/shared/storage-config.constant";
import { StorageType } from "@buildingai/constants/shared/storage-config.constant";
export { StorageType };

export interface StorageConfig<T extends StorageTypeType = StorageTypeType> {
    id: string;
    isActive: boolean;
    storageType: StorageTypeType;
    config: StorageConfigMap[T];
}

export type StorageConfigTableData = StorageConfig;

export function apiGetStorageConfigList(): Promise<StorageConfigTableData[]> {
    return useConsoleGet("/system-storage-config");
}

export function apiUpdateStorageConfig(storage: StorageConfig): Promise<StorageConfigTableData[]> {
    const { id, ...updateForm } = storage;
    return useConsolePatch(`/system-storage-config/${id}`, updateForm);
}
