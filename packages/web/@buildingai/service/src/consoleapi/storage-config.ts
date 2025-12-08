export const StorageType = {
    LOCAL: 1,
    ALIYUN_OSS: 2,
    TENCENT_COS: 3,
    QINIU_KODO: 4,
} as const;

export type StorageTypeType = (typeof StorageType)[keyof typeof StorageType];

export interface StorageConfigTableData {
    id: string;
    name: string;
    storageType: StorageTypeType;
    isActive: number;
    config: any;
}

export function apiGetStorageConfigList(): Promise<StorageConfigTableData[]> {
    return useConsoleGet("/system-storage-config");
}
