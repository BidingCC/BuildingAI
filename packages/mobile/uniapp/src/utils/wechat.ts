import { apiGetJssdkConfig } from "@/service/common";
import { isAndroid, isH5, isWechatOa } from "@/utils/env";

export class WechatH5 {
    private loadWxSdk() {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const win = window as any;
            if (win.wx && win.wx.config) return resolve(true);

            // 主 CDN
            const primaryUrl = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
            // 备用 CDN
            const fallbackUrl = "https://res2.wx.qq.com/open/js/jweixin-1.6.0.js";

            const script = document.createElement("script");
            script.src = primaryUrl;

            script.onload = () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const wx = (win as any).wx;
                if (wx && wx.config) {
                    resolve(wx);
                } else {
                    reject(new Error("wx.config 不存在"));
                }
            };

            script.onerror = () => {
                // 主 CDN 加载失败，尝试备用 CDN
                const fallbackScript = document.createElement("script");
                fallbackScript.src = fallbackUrl;
                fallbackScript.onload = () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const wx = (win as any).wx;
                    if (wx && wx.config) {
                        resolve(wx);
                    } else {
                        reject(new Error("wx.config 不存在"));
                    }
                };
                fallbackScript.onerror = () => {
                    reject(new Error("微信 JS-SDK 加载失败：主 CDN 和备用 CDN 均不可访问"));
                };
                document.head.appendChild(fallbackScript);
            };

            document.head.appendChild(script);
        });
    }
    //获取微信配置url
    signLink() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        if (typeof win.entryUrl === "undefined" || win.entryUrl === "") {
            win.entryUrl = location.href.split("#")[0] || "";
        }
        return isAndroid() ? location.href.split("#")[0] : win.entryUrl;
    }
    async initWx() {
        // 只在微信 H5 环境下执行配置
        if (!isH5 || !isWechatOa) {
            return;
        }
        await this.loadWxSdk();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wx = (window as any).wx;
        if (wx && wx.config) {
            const res = await apiGetJssdkConfig("chooseWXPay");
            wx.config({
                appId: res.appId,
                timestamp: res.timestamp,
                nonceStr: res.nonceStr,
                signature: res.signature,
                jsApiList: res.jsApiList,
                debug: false,
            });
        }
    }

    async chooseWXPay(options: {
        timestamp: string;
        nonceStr: string;
        package: string;
        signType: string;
        paySign: string;
    }) {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wx = (window as any).wx;
            if (!wx) {
                reject(new Error("微信 JS-SDK 未加载"));
                return;
            }
            wx.ready(() => {
                wx.chooseWXPay({
                    ...options,
                    success: () => {
                        resolve(true);
                    },
                    fail: () => {
                        reject(new Error("chooseWXPay fail"));
                    },
                    cancel: () => {
                        reject(new Error("chooseWXPay cancel"));
                    },
                });
            });
        });
    }
}

export const wechatH5 = new WechatH5();
