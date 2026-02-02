import type { StorageConfigMap, StorageTypeType } from "@buildingai/constants/shared";
import { StorageType } from "@buildingai/constants/shared";

export { StorageType };

export interface StorageConfig<T extends StorageTypeType = StorageTypeType> {
    id: string;
    isActive: boolean;
    storageType: StorageTypeType;
    config: StorageConfigMap[T];
}

export type StorageConfigTableData = Omit<StorageConfig, "config">;

export function apiGetStorageConfigList(): Promise<StorageConfigTableData[]> {
    return useConsoleGet("/system-storage-config");
}

export function apiUpdateStorageConfig(storage: StorageConfig): Promise<StorageConfigTableData[]> {
    const { id, ...updateForm } = storage;
    return useConsolePatch(`/system-storage-config/${id}`, updateForm);
}

export function apiGetStorageConfigDetail<T extends StorageTypeType = StorageTypeType>(
    id: string,
): Promise<StorageConfig<T>> {
    return useConsoleGet(`/system-storage-config/${id}`);
}
