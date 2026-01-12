export const SmsScene = {
    LOGIN: 1,
    REGISTER: 2,
    BIND_MOBILE: 3,
    CHANGE_MOBILE: 4,
    FIND_PASSWORD: 5,
} as const;
export type SmsSceneType = (typeof SmsScene)[keyof typeof SmsScene];

export const SmsProvider = {
    ALIYUN: "aliyun",
    TENCENT: "tencent",
} as const;
export type SmsProviderType = (typeof SmsProvider)[keyof typeof SmsProvider];

export interface AliyunSmsConfig {
    signName: string;
    appKey: string;
    secretKey: string;
}

export interface TencentSmsConfig {
    signName: string;
    appId: string;
    secretId: string;
    secretKey: string;
}

export type SmsProviderData = AliyunSmsConfig | TencentSmsConfig;

export interface SmsConfig {
    id: string;
    provider: SmsProviderType;
    providerConfig: SmsProviderData;
    enable: boolean;
    sort: number;
}
