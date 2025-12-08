import type {
    StorageConfigData,
    StorageTypeType,
} from "@buildingai/constants/shared/storage-config.constant";
import { StorageType } from "@buildingai/constants/shared/storage-config.constant";
export { StorageType, type StorageTypeType };

export interface StorageConfig {
    id: string;
    name: string;
    isActive: boolean;
    storageType: StorageTypeType;
    config: StorageConfigData;
}

export type StorageConfigTableData = StorageConfig;

export function apiGetStorageConfigList(): Promise<StorageConfigTableData[]> {
    return useConsoleGet("/system-storage-config");
}
