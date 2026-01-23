import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type RechargeRule = {
    id?: string;
    power: number;
    givePower: number;
    sellPrice: number;
    label: string;
};

export type RechargeConfigData = {
    rechargeStatus: boolean;
    rechargeExplain: string;
    rechargeRule: RechargeRule[];
};

export type UpdateRechargeConfigDto = {
    rechargeStatus: boolean;
    rechargeExplain?: string;
    rechargeRule: RechargeRule[];
};

/**
 * Get recharge config
 */
export function useRechargeConfigQuery(options?: QueryOptionsUtil<RechargeConfigData>) {
    return useQuery<RechargeConfigData>({
        queryKey: ["recharge-config"],
        queryFn: () => consoleHttpClient.get<RechargeConfigData>("/recharge-config"),
        ...options,
    });
}

/**
 * Save recharge config
 */
export function useSaveRechargeConfigMutation(
    options?: MutationOptionsUtil<RechargeConfigData, UpdateRechargeConfigDto>,
) {
    return useMutation<RechargeConfigData, Error, UpdateRechargeConfigDto>({
        mutationFn: (dto) => consoleHttpClient.post<RechargeConfigData>("/recharge-config", dto),
        ...options,
    });
}
