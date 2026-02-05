import {
    OrderPayFrom,
    type OrderPayFromType,
    PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";

/** 订单支付来源（与 OrderPayFrom 一致） */
export const PayFrom = OrderPayFrom;
export type PayFromValue = OrderPayFromType;

export interface PayOrder {
    orderSn: string;
    amount: number;
    payType: PayConfigType;
    from: OrderPayFromType;
}
export interface PayParams {
    payType: PayConfigType;
    appid: string;
    mchId: string;
    publicKey: string;
    privateKey: string;
}
