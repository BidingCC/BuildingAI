import {
    type PayConfigInfo,
    PayConfigPayType,
    type PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type SystemPayConfigItem = {
    id: string;
    /** 显示名称 */
    name: string;
    /** 支付方式类型（如微信、支付宝） */
    payType: number;
    /** 图标地址 */
    logo: string;
    /** 启用状态：0 禁用，1 启用 */
    isEnable: typeof BooleanNumber.YES | typeof BooleanNumber.NO;
    /** 是否默认：0 否，1 是 */
    isDefault: typeof BooleanNumber.YES | typeof BooleanNumber.NO;
    /** 排序权重，数值越小越靠前 */
    sort: number;
};

export type SystemPayConfigDetail = PayConfigInfo;

export const PayConfigPayTypeLabels: Record<PayConfigType, string> = {
    [PayConfigPayType.WECHAT]: "WeChat Pay",
    [PayConfigPayType.ALIPAY]: "Alipay",
} as const;

export type UpdateSystemPayconfigStatusDto = {
    /** 启用状态：0 禁用，1 启用 */
    isEnable: typeof BooleanNumber.YES | typeof BooleanNumber.NO;
};

export type UpdateSystemPayconfigDto = {
    id: string;
    name: string;
    logo: string;
    isEnable: number;
    isDefault: number;
    sort: number;
    payType: number;
    config: any;
};

/**
 * 获取支付配置列表（不分页）
 */
export function useSystemPayconfigListQuery(options?: QueryOptionsUtil<SystemPayConfigItem[]>) {
    return useQuery<SystemPayConfigItem[]>({
        queryKey: ["system-payconfig", "list"],
        queryFn: () => consoleHttpClient.get<SystemPayConfigItem[]>("/system-payconfig"),
        ...options,
    });
}

/**
 * 获取支付配置详情
 */
export function useSystemPayconfigDetailQuery(
    id: string,
    options?: QueryOptionsUtil<SystemPayConfigDetail>,
) {
    return useQuery<SystemPayConfigDetail>({
        queryKey: ["system-payconfig", "detail", id],
        queryFn: () => consoleHttpClient.get<SystemPayConfigDetail>(`/system-payconfig/${id}`),
        enabled: !!id && options?.enabled !== false,
        ...options,
    });
}

/**
 * 更新支付配置启用状态
 */
export function useUpdateSystemPayconfigStatusMutation(
    options?: MutationOptionsUtil<
        SystemPayConfigItem,
        { id: string; data: UpdateSystemPayconfigStatusDto }
    >,
) {
    return useMutation<
        SystemPayConfigItem,
        Error,
        { id: string; data: UpdateSystemPayconfigStatusDto }
    >({
        mutationFn: ({ id, data }) =>
            consoleHttpClient.patch<SystemPayConfigItem>(`/system-payconfig/${id}`, data),
        ...options,
    });
}

/**
 * 更新支付配置
 */
export function useUpdateSystemPayconfigMutation(
    options?: MutationOptionsUtil<SystemPayConfigDetail, UpdateSystemPayconfigDto>,
) {
    return useMutation<SystemPayConfigDetail, Error, UpdateSystemPayconfigDto>({
        mutationFn: (dto) =>
            consoleHttpClient.post<SystemPayConfigDetail>("/system-payconfig", dto),
        ...options,
    });
}

/**
 * 设置默认支付配置
 */
export function useSetDefaultSystemPayconfigMutation(
    options?: MutationOptionsUtil<SystemPayConfigDetail, { id: string }>,
) {
    return useMutation<SystemPayConfigDetail, Error, { id: string }>({
        mutationFn: ({ id }) =>
            consoleHttpClient.patch<SystemPayConfigDetail>(`/system-payconfig/setDefault/${id}`),
        ...options,
    });
}
