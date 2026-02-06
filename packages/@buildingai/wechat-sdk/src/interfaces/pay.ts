export interface WechatPayConfig {
    appId: string;
    mchId: string;
    publicKey: string;
    privateKey: string;
    apiSecret: string;
    domain: string;
}
export interface WechatPayNativeOrderParams {
    description: string;
    out_trade_no: string;
    amount: {
        total: number;
        currency?: string; // 可选，默认是CNY
    };
    attach: string;
}
export interface WechatPayNotifyParams {
    timestamp: string | number;
    nonce: string;
    body: Record<string, any> | string;
    serial: string;
    signature: string;
    apiSecret?: string;
}

export interface WechatPayNotifyAnalysisParams {
    outTradeNo: string;
    transactionId: string;
    attach: string;
    payer: Record<string, any>;
    amount: Record<string, any>;
}

export const resStatusCode = {
    CLOSED: 204,
    SUCCESS: 200,
    FAIL: 400,
} as const;
export type resStatusCodeType = (typeof resStatusCode)[keyof typeof resStatusCode];

export type resourceType = {
    original_type: string;
    algorithm: string;
    ciphertext: string;
    associated_data: string;
    nonce: string;
};

export interface WechatPayRefundParams {
    out_refund_no: string;
    out_trade_no: string;
    reason?: string;
    amount: {
        total: number;
        refund: number;
        currency: "CNY";
    };
}

/**
 * JSAPI（公众号/小程序）下单参数
 *
 * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_1_1.shtml
 */
export interface WechatPayJsapiOrderParams {
    /** 商品描述 */
    description: string;
    /** 商户订单号 */
    out_trade_no: string;
    /** 支付金额（元），内部会转为分 */
    amount: {
        total: number;
        currency?: string; // 默认 CNY
    };
    /** 附加数据，回调时原样返回（可选） */
    attach?: string;
    /** 支付者信息（JSAPI 必填 openid） */
    payer: {
        openid: string;
    };
}

/**
 * 前端调起支付参数（公众号/小程序通用结构）
 *
 * 公众号端一般由 wx.chooseWXPay 使用；小程序端由 wx.requestPayment 使用。
 */
export type WechatPayJsapiPayParams = {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: "RSA";
    paySign: string;
};

/**
 * H5（手机浏览器）下单参数
 *
 * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_3_1.shtml
 */
export interface WechatPayH5OrderParams {
    /** 商品描述 */
    description: string;
    /** 商户订单号 */
    out_trade_no: string;
    /** 支付金额（元），内部会转为分 */
    amount: {
        total: number;
        currency?: string;
    };
    /** 附加数据，回调时原样返回（可选） */
    attach?: string;
    /** 场景信息：用户端 IP 与 H5 信息 */
    scene_info: {
        /** 用户端实际 IP，如从 request 获取 */
        payer_client_ip: string;
        /** H5 信息 */
        h5_info: {
            /** 场景类型，如 "Wap" */
            type: string;
        };
    };
}

/** H5 下单返回：跳转支付链接 */
export interface WechatPayH5OrderResult {
    h5_url: string;
}
