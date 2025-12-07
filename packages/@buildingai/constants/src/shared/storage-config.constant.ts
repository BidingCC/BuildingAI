export const StorageType = {
    LOCAL: 1,
    ALIYUN_OSS: 2,
    TENCENT_COS: 3,
    QINIU_KODO: 4,
} as const;

export type StorageTypeType = (typeof StorageType)[keyof typeof StorageType];

export interface LocalStorageConfig {}

interface CloudStorageConfig {
    bucket: string;
    accessKey: string;
    secretKey: string;
    domain: string;
}

export interface AliyunOssConfig extends CloudStorageConfig {
    endpoint?: string;
    arn?: string;
}

export interface TencentCosConfig extends CloudStorageConfig {
    region: string;
}

export interface QiniuKodoConfig extends CloudStorageConfig {}

export type StorageConfigData =
    | LocalStorageConfig
    | AliyunOssConfig
    | TencentCosConfig
    | QiniuKodoConfig;
