export const PayConfigPayType = {
    WECHAT: "wechat", //微信支付
    ALIPAY: "alipay", //支付宝支付
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
    // subMchId?: string;
}

// 预留
// export const AlipayMerchant = {
//     SELF: "self",
//     ISV: "isv",
// } as const;
// export type AlipayMerchantType = (typeof AlipayMerchant)[keyof typeof AlipayMerchant];

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
    signType: AlipaySignTypeType;
    // merchantType: AlipayMerchantType;
    // pid?: string;
}

export interface PayConfigMap {
    [PayConfigPayType.WECHAT]: WeChatPayConfig;
    [PayConfigPayType.ALIPAY]: AlipayConfig;
}

export type PaymentConfig = WeChatPayConfig | AlipayConfig;
