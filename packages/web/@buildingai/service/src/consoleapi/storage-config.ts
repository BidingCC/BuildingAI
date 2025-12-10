import type {
    StorageConfigMap,
    StorageTypeType,
} from "@buildingai/constants/shared/storage-config.constant";
import { StorageType } from "@buildingai/constants/shared/storage-config.constant";
export { StorageType };

export interface StorageConfig<T extends StorageTypeType = StorageTypeType> {
    id: string;
    name: string;
    isActive: boolean;
    storageType: StorageTypeType;
    config: StorageConfigMap[T];
}

export type StorageConfigTableData = StorageConfig;

export function apiGetStorageConfigList(): Promise<StorageConfigTableData[]> {
    return useConsoleGet("/system-storage-config");
}
