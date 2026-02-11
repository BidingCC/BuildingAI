import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

/**
 * 网站信息（与后端 WebInfoDto 对应）
 */
export type WebsiteWebinfo = {
    name: string;
    description?: string;
    icon?: string;
    logo?: string;
    spaLoadingIcon?: string;
    version?: string;
    isDemo?: boolean;
};

/**
 * 版权/备案信息（与后端 CopyrightDto 对应）
 */
export type WebsiteCopyright = {
    displayName?: string;
    iconUrl?: string;
    url?: string;
    copyrightText?: string;
    copyrightBrand?: string;
    copyrightUrl?: string;
};

/**
 * 站点统计（与后端 StatisticsDto 对应）
 */
export type WebsiteStatistics = {
    appid: string;
};

/**
 * 网站配置完整响应（与 getConfig 返回结构一致）
 */
export type WebsiteConfigResponse = {
    webinfo: WebsiteWebinfo;
    agreement: Record<string, unknown>;
    copyright: WebsiteCopyright;
    statistics: WebsiteStatistics;
};

/**
 * 更新网站配置 DTO（与后端 UpdateWebsiteDto 一致，各段可选）
 */
export type UpdateWebsiteDto = {
    webinfo?: Partial<WebsiteWebinfo>;
    agreement?: Record<string, unknown>;
    copyright?: Partial<WebsiteCopyright>;
    statistics?: Partial<WebsiteStatistics>;
};

/**
 * 获取网站配置
 */
export function useWebsiteConfigQuery(options?: QueryOptionsUtil<WebsiteConfigResponse>) {
    return useQuery<WebsiteConfigResponse>({
        queryKey: ["system-website", "config"],
        queryFn: () => consoleHttpClient.get<WebsiteConfigResponse>("/system-website"),
        ...options,
    });
}

/**
 * 设置网站配置（支持只传 webinfo / copyright / statistics 等任意一段）
 */
export function useSetWebsiteConfigMutation(
    options?: MutationOptionsUtil<{ success: boolean }, UpdateWebsiteDto>,
) {
    return useMutation<{ success: boolean }, Error, UpdateWebsiteDto>({
        mutationFn: (dto) =>
            consoleHttpClient.post<{ success: boolean }>("/system-website", dto),
        ...options,
    });
}
