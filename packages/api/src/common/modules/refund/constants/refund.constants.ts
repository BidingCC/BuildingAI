export const REFUND_ORDER_FROM = {
    FROM_RECHARGE: 1,
    FROM_MEMBERSHIP: 2,
} as const;
export type REFUND_ORDER_FROM_VALUE = (typeof REFUND_ORDER_FROM)[keyof typeof REFUND_ORDER_FROM];

export const REFUND_STATUS = {
    REFUND_ING: 1,
    REFUND_SUCCESS: 2,
    REFUND_FAILED: 3,
} as const;
export type REFUND_STATUS_VALUE = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_ORDER_FROM_DESC = {
    FROM_RECHARGE: "充值订单",
    FROM_MEMBERSHIP: "会员订单",
} as const;

export const REFUND_STATUS_DESC = {
    REFUND_ING: "退款中",
    REFUND_SUCCESS: "退款成功",
    REFUND_FAILED: "退款失败",
} as const;
