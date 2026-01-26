import { PayConfigType } from "@buildingai/constants/shared/payconfig.constant";

export const PayFrom = {
    RECHARGE: "recharge",
    ORDER: "order",
    MEMBERSHIP: "membership",
} as const;
export type PayFromValue = (typeof PayFrom)[keyof typeof PayFrom];

export interface PayOrder {
    orderSn: string;
    amount: number;
    payType: PayConfigType;
    from: PayFromValue;
}
export interface PayParams {
    payType: PayConfigType;
    appid: string;
    mchId: string;
    publicKey: string;
    privateKey: string;
}
