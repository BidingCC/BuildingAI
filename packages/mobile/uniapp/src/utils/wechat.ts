import { apiGetJssdkConfig } from "@/service/common";
import { isAndroid, isH5, isWechatOa } from "@/utils/env";

export class WechatH5 {
    //获取微信配置url
    static signLink() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        if (typeof win.entryUrl === "undefined" || win.entryUrl === "") {
            win.entryUrl = location.href.split("#")[0] || "";
        }
        return isAndroid() ? location.href.split("#")[0] : win.entryUrl;
    }
    async config() {
        // 只在微信 H5 环境下执行配置
        if (!isH5 || !isWechatOa) {
            return;
        }
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

    async chooseWXPay(options: {
        timestamp: string;
        nonceStr: string;
        package: string;
        signType: string;
        paySign: string;
    }) {
        return new Promise((resolve, reject) => {
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
