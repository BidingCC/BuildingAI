export interface AlipayConfig {
    /**
     * App id
     */
    appId: string;

    /**
     * App private key, PKCS1 or PKCS8
     */
    privateKey: string;

    /**
     * Alipay public key certificate path
     */
    alipayPublicCertPath?: string;

    /**
     * Alipay public key certificate content
     */
    alipayPublicCertContent?: string;

    /**
     * App public key certificate path
     */
    appCertPath?: string;

    /**
     * App public key certificate content
     */
    appCertContent?: string;

    /**
     * Alipay root certificate path
     */
    alipayRootCertPath?: string;

    /**
     * Alipay Root certificate content
     */
    alipayRootCertContent?: string;

    gateway?: string;
    useCert?: boolean;

    signType?: "RSA2";
    charset?: "utf-8";
    version?: "1.0";
}

export interface AlipayWebPayParams {
    /**
     * out_trade_no, unique
     */
    outTradeNo: string;

    /**
     * Amount
     */
    totalAmount: string;

    /**
     * Order title
     */
    subject: string;

    /**
     * @default - FAST_INSTANT_TRADE_PAY
     */
    productCode?: string;

    /**
     * Order description
     */
    body?: string;

    timeoutExpress?: string;

    passbackParams?: string;

    notifyUrl?: string;

    // returnUrl?: string;
}

export interface AlipayWapPayParams extends AlipayWebPayParams {
    quitUrl?: string;
}

export interface AlipayQueryParams {
    /**
     * Choose between outTradeNo and tradeNo
     */
    outTradeNo?: string;

    /**
     * Choose between outTradeNo and tradeNo
     */
    tradeNo?: string;
}

export interface AlipayRefundParams {
    /**
     * Choose between outTradeNo and tradeNo
     */
    outTradeNo?: string;

    /**
     * Choose between outTradeNo and tradeNo
     */
    tradeNo?: string;

    refundAmount: string;

    refundReason?: string;

    outRequestNo?: string;
}

export interface AlipayCloseParams {
    outTradeNo: string;
}

export interface AlipayNotifyParams {}
