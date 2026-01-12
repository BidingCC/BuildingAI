import type { SmsConfig, SmsProviderData, SmsProviderType } from "@buildingai/constants";

export interface UpdateSmsConfigDto {
    provider: SmsProviderType;
    config: SmsProviderData;
    isActive: boolean;
}

/**
 * 获取所有短信配置
 */
export const apiGetSmsConfigList = () => {
    return useConsoleGet<SmsConfig[]>("/sms-config");
};

/**
 * 获取指定提供商的短信配置
 */
export const apiGetSmsConfigDetail = (provider: SmsProviderType) => {
    return useConsoleGet(`/console/sms-config/${provider}`);
};

/**
 * 更新短信配置
 */
export const apiUpdateSmsConfig = (data: UpdateSmsConfigDto) => {
    return useConsoleGet("/console/sms-config", data);
};
