export const PayConfigPayType = {
    WECHAT: 1, //微信支付
    ALIPAY: 2, //支付宝支付
} as const;
export type PayConfigType = (typeof PayConfigPayType)[keyof typeof PayConfigPayType];

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
    appId: string;
    mchId: string;
    apiKey: string;
    paySignKey: string;
    cert: string;
    merchantType: MerchantType;
    payVersion: PayVersionType;
    payAuthDir?: string;
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
}

export type PayConfigInfo = WeChatPayConfigInfo | AlipayPayConfigInfo;
