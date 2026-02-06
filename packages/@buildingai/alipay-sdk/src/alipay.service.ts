import { Logger } from "@nestjs/common";
import { AlipaySdk, type AlipaySdkConfig } from "alipay-sdk";

import {
    AlipayCloseParams,
    AlipayConfig,
    AlipayQueryParams,
    AlipayRefundParams,
    AlipayWapPayParams,
    AlipayWebPayParams,
} from "./interfaces";

export class AlipayService {
    private readonly config: AlipayConfig;
    private alipaySdk: AlipaySdk;
    private logger = new Logger(AlipayService.name);

    constructor(config: AlipayConfig) {
        const { gateway, ...otherConfig } = config;
        this.config = {
            charset: "utf-8",
            signType: "RSA2",
            version: "1.0",
            useCert: true,
            gateway: gateway || "https://openapi.alipay.com/gateway.do",
            ...otherConfig,
        };

        const sdk = this.init();
        if (!sdk) {
            throw new Error("Alipay SDK failed to initialize");
        }

        this.alipaySdk = sdk;
    }

    private init() {
        try {
            const sdkConfig: AlipaySdkConfig = {
                appId: this.config.appId,
                privateKey: this.config.privateKey,
                gateway: this.config.gateway,
                charset: this.config.charset,
                signType: this.config.signType,
                version: this.config.version,
            };

            if (this.config.useCert) {
                // Public cert, content first
                if (this.config.alipayPublicCertContent) {
                    sdkConfig.alipayPublicCertContent = this.config.alipayPublicCertContent;
                } else if (this.config.alipayPublicCertPath) {
                    sdkConfig.alipayPublicCertPath = this.config.alipayPublicCertPath;
                } else {
                    throw new Error("Alipay public key certificate is not configured");
                }

                // App public key, content first
                if (this.config.appCertContent) {
                    sdkConfig.appCertContent = this.config.appCertContent;
                } else if (this.config.appCertPath) {
                    sdkConfig.appCertPath = this.config.appCertPath;
                } else {
                    throw new Error("Application public key certificate not configured");
                }

                // Root cert, content first
                if (this.config.alipayRootCertContent) {
                    sdkConfig.alipayRootCertContent = this.config.alipayRootCertContent;
                } else if (this.config.alipayRootCertPath) {
                    sdkConfig.alipayRootCertPath = this.config.alipayRootCertPath;
                } else {
                    throw new Error("Alipay root certificate is not configured");
                }

                const sdk = new AlipaySdk(sdkConfig);
                this.logger.log("Alipay SDK was initialized successfully");

                return sdk;
            }
        } catch (error) {
            this.logger.error("Alipay SDK failed to initialize", error);
            throw new Error(`Alipay SDK failed to initialize: ${error}`);
        }
    }

    async createWebPay(params: AlipayWebPayParams) {
        const bizContent: any = {
            out_trade_no: params.outTradeNo,
            total_amount: params.totalAmount,
            subject: params.subject,
            product_code: "FAST_INSTANT_TRADE_PAY",
        };

        if (params.body) {
            bizContent.body = params.body;
        }

        if (params.timeoutExpress) {
            bizContent.timeout_express = params.timeoutExpress;
        }

        // Pass-through parameters (used by callbacks to identify the business type)
        if (params.passbackParams) {
            bizContent.passback_params = params.passbackParams;
        } else if (params.body && params.body.includes("from:")) {
            // Try to get from the body
            const fromMatch = params.body.match(/from:(\w+)/);
            if (fromMatch) {
                bizContent.passback_params = fromMatch[1];
            }
        }

        const result = this.alipaySdk.pageExecute("alipay.trade.page.pay", {
            bizContent,
            method: "POST",
            // returnUrl: params.returnUrl,
            notifyUrl: params.notifyUrl,
        });

        this.logger.log(`Create Alipay order successfully: ${params.outTradeNo}`);

        return result;
    }

    /**
     * 手机网站支付（alipay.trade.wap.pay）
     * 文档：https://opendocs.alipay.com/open/29ae8cb6_alipay.trade.wap.pay
     * 用于手机浏览器场景，返回表单 HTML，前端提交后跳转支付宝收银台
     */
    async createWapPay(params: AlipayWapPayParams) {
        const bizContent: Record<string, string> = {
            out_trade_no: params.outTradeNo,
            total_amount: params.totalAmount,
            subject: params.subject,
            product_code: params.productCode ?? "QUICK_WAP_WAY",
        };

        if (params.body) {
            bizContent.body = params.body;
        }

        if (params.timeoutExpress) {
            bizContent.timeout_express = params.timeoutExpress;
        }

        if (params.passbackParams) {
            bizContent.passback_params = params.passbackParams;
        } else if (params.body?.includes("from:")) {
            const fromMatch = params.body.match(/from:(\w+)/);
            if (fromMatch?.[1]) {
                bizContent.passback_params = fromMatch[1];
            }
        }

        const executeParams: Record<string, unknown> = {
            bizContent,
            method: "POST",
        };
        if (params.notifyUrl) {
            executeParams.notifyUrl = params.notifyUrl;
        }
        if (params.quitUrl) {
            executeParams.quitUrl = params.quitUrl;
        }

        const result = this.alipaySdk.pageExecute("alipay.trade.wap.pay", executeParams);

        this.logger.log(`Create Alipay WAP order successfully: ${params.outTradeNo}`);

        return result;
    }

    async query(params: AlipayQueryParams) {
        try {
            const bizContent: any = {};
            if (params.outTradeNo) {
                bizContent.out_trade_no = params.outTradeNo;
            }
            if (params.tradeNo) {
                bizContent.trade_no = params.tradeNo;
            }

            if (!bizContent.out_trade_no && !bizContent.trade_no) {
                throw new Error("outTradeNo and tradeNo provide at least one");
            }

            return await this.alipaySdk.exec("alipay.trade.query", {
                bizContent,
            });
        } catch (error) {
            throw new Error(`Order query failed: ${error}`);
        }
    }

    async close(params: AlipayCloseParams) {
        try {
            const bizContent = {
                out_trade_no: params.outTradeNo,
            };

            return await this.alipaySdk.exec("alipay.trade.close", { bizContent });
        } catch (error) {
            throw new Error(`Failed to close order: ${error}`);
        }
    }

    refund(params: AlipayRefundParams) {
        try {
            const bizContent: any = {
                refund_amount: params.refundAmount,
            };

            if (params.outTradeNo) {
                bizContent.out_trade_no = params.outTradeNo;
            }

            if (params.tradeNo) {
                bizContent.trade_no = params.tradeNo;
            }

            if (!bizContent.out_trade_no && !bizContent.trade_no) {
                throw new Error("outTradeNo and tradeNo provide at least one");
            }

            if (params.refundReason) {
                bizContent.refund_reason = params.refundReason;
            }

            if (params.outRequestNo) {
                bizContent.out_request_no = params.outRequestNo;
            }

            return this.alipaySdk.exec("alipay.trade.refund", { bizContent });
        } catch (error) {
            throw new Error(`Failed refund application: ${error}`);
        }
    }

    /**
     * @param outTradeNo
     * @param outRequestNo - ref: https://opendocs.alipay.com/support/01ray6
     */
    refundQuery(outTradeNo: string, outRequestNo?: string) {
        try {
            const bizContent = {
                out_trade_no: outTradeNo,
                out_request_no: outRequestNo,
            };

            return this.alipaySdk.exec("alipay.trade.fastpay.refund.query", {
                bizContent,
            });
        } catch (error) {
            throw new Error(`Refund query failed: ${error}`);
        }
    }

    checkNotifySign(postData: any) {
        try {
            const isOk = this.alipaySdk.checkNotifySign(postData);
            if (!isOk) {
                this.logger.error("Async callback signature validation failed");
                this.logger.debug("Callback data:", postData);
            }

            return isOk;
        } catch (error) {
            this.logger.error("Verify async callback signature exception", error);
            return false;
        }
    }

    checkNotifySignV2(getData: any) {
        try {
            const isOk = this.alipaySdk.checkNotifySignV2(getData);
            if (!isOk) {
                this.logger.error("Async callback signature validation failed");
                this.logger.debug("Callback data:", getData);
            }

            return isOk;
        } catch (error) {
            this.logger.error("Verify async callback signature exception", error);
            return false;
        }
    }
}
