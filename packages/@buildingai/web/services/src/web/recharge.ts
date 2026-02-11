import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type RechargeRuleItem = {
    id: string;
    power: number;
    givePower: number;
    sellPrice: number;
    label: string;
};

export type RechargeCenterResponse = {
    user: {
        id: string;
        userNo?: string;
        username?: string;
        avatar?: string | null;
        power?: number;
    } | null;
    rechargeStatus: boolean;
    rechargeExplain: string;
    rechargeRule: RechargeRuleItem[];
    payWayList: {
        name: string;
        payType: number;
        logo: string | null;
        isDefault: typeof BooleanNumber.YES | typeof BooleanNumber.NO;
    }[];
};

export type SubmitRechargeParams = {
    id: string;
    payType: number;
};

export type SubmitRechargeResponse = {
    orderId: string;
    orderNo: string;
    orderAmount: number;
};

export function useRechargeCenterQuery(options?: QueryOptionsUtil<RechargeCenterResponse>) {
    return useQuery<RechargeCenterResponse>({
        queryKey: ["recharge", "center"],
        queryFn: () => apiHttpClient.get<RechargeCenterResponse>("/recharge/center"),
        ...options,
    });
}

export function useSubmitRechargeMutation(
    options?: MutationOptionsUtil<SubmitRechargeResponse, SubmitRechargeParams>,
) {
    return useMutation<SubmitRechargeResponse, Error, SubmitRechargeParams>({
        mutationFn: (body) =>
            apiHttpClient.post<SubmitRechargeResponse>("/recharge/submitRecharge", body),
        ...options,
    });
}
