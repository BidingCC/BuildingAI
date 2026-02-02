export const StorageType = {
    LOCAL: "local",
    OSS: "oss",
    COS: "cos",
    KODO: "kodo",
} as const;

export type StorageTypeType = (typeof StorageType)[keyof typeof StorageType];

interface StorageConfigBase {
    bucket: string;
    accessKey: string;
    secretKey: string;
    domain: string;
    region: string;
}

export interface AliyunOssConfig extends StorageConfigBase {
    arn: string;
}

export type LocalStorageConfig = null;
export type TencentCosConfig = StorageConfigBase;
export type QiniuKodoConfig = StorageConfigBase;

export interface StorageConfigMap {
    [StorageType.LOCAL]: LocalStorageConfig;
    [StorageType.OSS]: AliyunOssConfig;
    [StorageType.COS]: TencentCosConfig;
    [StorageType.KODO]: QiniuKodoConfig;
}

export type StorageConfigData =
    | LocalStorageConfig
    | AliyunOssConfig
    | TencentCosConfig
    | QiniuKodoConfig;
