import { Logger } from "@nestjs/common";
import crypto from "crypto";
import QRCode from "qrcode";
import WechatPay from "wechatpay-node-v3";

import { resourceType, resStatusCode, WechatPayRefundParams } from "../interfaces/pay";
import {
    WechatPayConfig,
    WechatPayNativeOrderParams,
    WechatPayNotifyParams,
} from "../interfaces/pay";

export class WechatPayService {
    private client: WechatPay;
    config: WechatPayConfig;
    private logger = new Logger();

    constructor(config: WechatPayConfig) {
        this.config = config;
        const { appId, mchId, publicKey, privateKey, apiSecret } = config;

        this.client = new WechatPay({
            appid: appId, //appid
            mchid: mchId, //商户号
            publicKey: Buffer.from(publicKey, "utf-8"), // 证书
            privateKey: Buffer.from(privateKey, "utf-8"), // 秘钥
            key: apiSecret,
        });
    }

    /**
     * 创建微信支付原生订单
     *
     * 调用微信支付API创建原生支付订单，生成支付二维码
     * 订单创建成功后返回二维码的Data URL格式
     *
     * @param params 订单参数
     * @param params.out_trade_no 商户订单号，用于标识订单
     * @param params.description 商品描述
     * @param params.amount 支付金额信息
     * @param params.amount.total 支付金额（分）
     * @param params.amount.currency 货币类型，默认CNY
     * @returns 包含二维码Data URL的对象
     */
    async createNativeOrder(params: WechatPayNativeOrderParams): Promise<{ code_url: string }> {
        // 验证输入参数
        if (params.out_trade_no.length >= 32) {
            throw new Error("商户订单号长度不能超过32位");
        }

        if (params.amount.total <= 0) {
            throw new Error("支付金额必须大于0");
        }
        this.logger.log(
            this.config.domain + process.env.VITE_APP_WEB_API_PREFIX + "/pay/notifyWxPay",
        );
        // 调用微信支付客户端创建原生支付订单
        const res = await this.client.transactions_native({
            out_trade_no: params.out_trade_no,
            description: params.description,
            //域名拼接请求前缀，用于回调
            notify_url:
                this.config.domain + process.env.VITE_APP_WEB_API_PREFIX + "/pay/notifyWxPay",
            amount: {
                total: Math.round(params.amount.total * 100),
                currency: params.amount.currency,
            },
            attach: params.attach,
        });
        console.log({
            out_trade_no: params.out_trade_no,
            description: params.description,
            //域名拼接请求前缀，用于回调
            notify_url:
                this.config.domain + process.env.VITE_APP_WEB_API_PREFIX + "/pay/notifyWxPay",
            amount: {
                total: Math.round(params.amount.total * 100),
                currency: params.amount.currency,
            },
            attach: params.attach,
        });

        const { status, error, data } = res;

        // 检查API调用是否成功
        if (status !== resStatusCode.SUCCESS) {
            const errorMessage = JSON.parse(error).message;
            throw new Error(errorMessage);
        }

        // 将微信返回的二维码URL转换为Data URL格式
        const code_url = await QRCode.toDataURL(data.code_url);
        return { code_url };
    }

    /**
     * 根据商户订单号查询支付状态
     *
     * @param out_trade_no 商户订单号
     * @returns 支付状态信息
     */
    async queryOrderStatus(out_trade_no: string) {
        const res = await this.client.query({ out_trade_no });
        const { status, error, data } = res;

        if (status !== resStatusCode.SUCCESS) {
            const errorMessage = JSON.parse(error).message;
            throw new Error(errorMessage);
        }

        return data;
    }

    /**
     * 关闭订单（未支付）
     *
     * @param out_trade_no 商户订单号
     * @returns 关闭订单结果
     */
    async closeOrder(out_trade_no: string) {
        const res = await this.client.close(out_trade_no);
        const { status, error, data } = res;

        if (status !== resStatusCode.SUCCESS) {
            const errorMessage = JSON.parse(error).message;
            throw new Error(errorMessage);
        }

        return data;
    }

    /**
     * 支付回调验证
     *
     * @param signParams 支付回调签名参数
     * @returns 验证结果
     */
    async notifyPay(signParams: WechatPayNotifyParams) {
        const res = await this.client.verifySign(signParams);
        return res;
    }

    /**
     * 解密回调请求体
     */
    decryptNotifyBody(resource: resourceType) {
        const buffer = Buffer.from(resource.ciphertext, "base64");

        const authTag = buffer.subarray(buffer.length - 16);
        const data = buffer.subarray(0, buffer.length - 16);

        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            Buffer.from(this.config.apiSecret, "utf8"),
            resource.nonce,
        );
        decipher.setAuthTag(authTag);
        decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));

        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8"));
    }

    /**
     * 申请退款
     *
     * @param params 退款参数
     * @returns 退款结果
     */
    async refund(params: WechatPayRefundParams) {
        const res = await this.client.refunds({
            //商户系统内部的退款单号，商户系统内部唯一，只能是数字、大小写字母
            out_refund_no: params.out_refund_no,
            //商户下单时传入的商户系统内部订单号。
            out_trade_no: params.out_trade_no,
            //退款原因（可选）
            reason: params.reason,
            //退款结果通知url
            notify_url:
                this.config.domain +
                process.env.VITE_APP_CONSOLE_API_PREFIX +
                "/pay/notifyRefundWxPay",
            amount: {
                //退款金额，币种的最小单位，只能为整数，不能超过原订单支付金额
                total: Math.round(params.amount.total * 100),
                //原支付交易的订单总金额，币种的最小单位，只能为整数
                refund: Number(params.amount.refund * 100),
                currency: "CNY",
            },
        });
        const { status, error, data } = res;

        if (status !== resStatusCode.SUCCESS) {
            const errorMessage = JSON.parse(error).message;
            throw new Error(errorMessage);
        }

        return data;
    }

    /**
     * 查询退款状态
     *
     * @param out_refund_no 退款订单号
     * @returns 退款状态信息
     */
    async queryRefundStatus(out_refund_no: string) {
        const res = await this.client.find_refunds(out_refund_no);
        const { status, error, data } = res;

        if (status !== resStatusCode.SUCCESS) {
            const errorMessage = JSON.parse(error).message;
            throw new Error(errorMessage);
        }

        return data;
    }
}

export default WechatPayService;
