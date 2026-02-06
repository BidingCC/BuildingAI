export const PayConfigPayType = {
    WECHAT: 1, //微信支付
    ALIPAY: 2, //支付宝支付
} as const;
export type PayConfigType = (typeof PayConfigPayType)[keyof typeof PayConfigPayType];
export type PayConfigTypeKey = [keyof typeof PayConfigPayType];
export const PayConfigPayTypeReverse = {
    [PayConfigPayType.WECHAT]: "WECHAT",
    [PayConfigPayType.ALIPAY]: "ALIPAY",
} as const;

/**
 * 商户类型, 适用于 WeChatPay
 */
export const Merchant = {
    ORDINARY: "ordinary",
    CHILD: "child",
} as const;
export type MerchantType = (typeof Merchant)[keyof typeof Merchant];

/**
 * 支付版本, 适用于 WeChatPay
 */
export const PayVersion = {
    V2: "V2",
    V3: "V3",
} as const;
export type PayVersionType = (typeof PayVersion)[keyof typeof PayVersion];

export interface WeChatPayConfig {
    mchId: string;
    apiKey: string;
    paySignKey: string;
    cert: string;
    merchantType: MerchantType;
    payVersion: PayVersionType;
    payAuthDir: string;
}

export const AlipaySignType = {
    RSA: "RSA",
    RSA2: "RSA2",
} as const;
export type AlipaySignTypeType = (typeof AlipaySignType)[keyof typeof AlipaySignType];

export interface AlipayConfig {
    appId: string;
    gateway: string;
    privateKey: string;
    appCert: string;
    alipayPublicCert: string;
    alipayRootCert: string;
    // merchantType: AlipayMerchantType;
    // pid?: string;
}

export interface PayConfigMap {
    [PayConfigPayType.WECHAT]: WeChatPayConfig;
    [PayConfigPayType.ALIPAY]: AlipayConfig;
}

export type PaymentConfig = WeChatPayConfig | AlipayConfig;

interface BasePayConfigInfo {
    id: string;
    name: string;
    logo: string;
    isEnable: number;
    isDefault: number;
    sort: number;
}

export interface AlipayPayConfigInfo extends BasePayConfigInfo {
    payType: typeof PayConfigPayType.ALIPAY;
    config: AlipayConfig | null;
}

export interface WeChatPayConfigInfo extends BasePayConfigInfo {
    payType: typeof PayConfigPayType.WECHAT;
    config: WeChatPayConfig | null;
    /** 支付授权目录（接口从 APP_DOMAIN 生成返回） */
    payAuthDir?: string;
}

export type PayConfigInfo = WeChatPayConfigInfo | AlipayPayConfigInfo;

export const OrderPayFrom = {
    RECHARGE: "recharge",
    MEMBERSHIP: "membership",
} as const;
export type OrderPayFromType = (typeof OrderPayFrom)[keyof typeof OrderPayFrom];

/** 支付超时时间（毫秒），超时未支付可关闭订单。10 分钟 */
export const PAY_TIMEOUT = 10 * 60 * 1000;

/** 退款提交后延时查询退款结果的间隔（毫秒），5 分钟后主动查一次渠道结果 */
export const REFUND_QUERY_DELAY_MS = 5 * 60 * 1000;

//订单状态

export const OrderStatus = {
    CREATED: 0, //待支付
    SUCCESS: 1, //已完成
    CLOSED: 2, //订单关闭
} as const;
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
export const OrderStatusReverse = {
    [OrderStatus.CREATED]: "待支付",
    [OrderStatus.SUCCESS]: "已完成",
    [OrderStatus.CLOSED]: "订单关闭",
} as const;
export type OrderStatusReverseType = (typeof OrderStatusReverse)[keyof typeof OrderStatusReverse];

//支付状态

export const PayStatus = {
    PENDING: 0, //待支付
    PAID: 1, //已支付
} as const;
export type PayStatusType = (typeof PayStatus)[keyof typeof PayStatus];
export const PayStatusReverse = {
    [PayStatus.PENDING]: "待支付",
    [PayStatus.PAID]: "已支付",
} as const;
export type PayStatusReverseType = (typeof PayStatusReverse)[keyof typeof PayStatusReverse];

//退款状态
export const RefundStatus = {
    NONE: 0, //未退款
    SUCCESS: 1, //已退款
    FAILED: 2, //退款失败
    ING: 3, //退款中
} as const;
export type RefundStatusType = (typeof RefundStatus)[keyof typeof RefundStatus];
export const RefundStatusReverse = {
    [RefundStatus.NONE]: "未退款",
    [RefundStatus.SUCCESS]: "已退款",
    [RefundStatus.FAILED]: "退款异常",
    [RefundStatus.ING]: "退款中",
} as const;
export type RefundStatusReverseType =
    (typeof RefundStatusReverse)[keyof typeof RefundStatusReverse];
