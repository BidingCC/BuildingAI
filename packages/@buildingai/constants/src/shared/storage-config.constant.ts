export const StorageType = {
    LOCAL: "local",
    ALIYUN_OSS: "aliyun-oss",
    TENCENT_COS: "tencent-cos",
    QINIU_KODO: "qiniu-kodo",
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

export interface StorageConfigMap {
    [StorageType.LOCAL]: LocalStorageConfig;
    [StorageType.ALIYUN_OSS]: AliyunOssConfig;
    [StorageType.TENCENT_COS]: TencentCosConfig;
    [StorageType.QINIU_KODO]: QiniuKodoConfig;
}

export type StorageConfigData =
    | LocalStorageConfig
    | AliyunOssConfig
    | TencentCosConfig
    | QiniuKodoConfig;
