/**
 * @fileoverview 拉起支付 Hook
 * @description 统一封装微信、支付宝等支付调起，按端区分：小程序已实现微信，H5/公众号/APP 预留
 */

import { PayConfigPayType, UserTerminal } from "@buildingai/constants";

import type { PrepaidInfo } from "@/service/pay";
import { getTerminal, isApp, isH5, isMpWeixin, isWechatOa } from "@/utils/env";

/** 是否包含微信 JSAPI 调起参数 */
function hasWechatJsapiParams(info: PrepaidInfo): boolean {
    return !!(info.timeStamp && info.nonceStr && info.package && info.paySign);
}

/**
 * 微信小程序内调起支付
 */
function launchWechatMpPay(params: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
}): Promise<void> {
    return new Promise((resolve, reject) => {
        uni.requestPayment({
            provider: "wxpay",
            timeStamp: params.timeStamp,
            nonceStr: params.nonceStr,
            package: params.package,
            signType: params.signType || "RSA",
            paySign: params.paySign,
            success: () => resolve(),
            fail: (err: UniApp.GeneralCallbackResult | undefined) => {
                const msg =
                    (err && "errMsg" in err ? err.errMsg : (err as unknown as Error)?.message) ||
                    "支付取消或失败";
                if (String(msg).includes("cancel") || String(msg).includes("取消")) {
                    reject(new Error("用户取消支付"));
                } else {
                    reject(new Error(String(msg)));
                }
            },
        });
    });
}

/** 调起微信支付（按端：小程序已实现，H5/公众号/APP 预留） */
async function launchWechatPay(prepaidInfo: PrepaidInfo, scene: number): Promise<void> {
    if (!hasWechatJsapiParams(prepaidInfo)) {
        throw new Error("预支付返回缺少微信调起参数");
    }

    const timeStamp = prepaidInfo.timeStamp;
    const nonceStr = prepaidInfo.nonceStr;
    const packageVal = prepaidInfo.package;
    const paySign = prepaidInfo.paySign;
    if (!timeStamp || !nonceStr || !packageVal || !paySign) {
        throw new Error("预支付返回缺少微信调起参数");
    }

    const params = {
        timeStamp,
        nonceStr,
        package: packageVal,
        signType: prepaidInfo.signType || "RSA",
        paySign,
    };

    if (scene === UserTerminal.MP || isMpWeixin) {
        await launchWechatMpPay(params);
        return;
    }

    if (scene === UserTerminal.OA && isH5 && isWechatOa) {
        // TODO: 公众号 H5 内调起（wx.chooseWXPay）
        uni.showToast({ title: "公众号支付开发中", icon: "none" });
        return;
    }

    if (scene === UserTerminal.APP || isApp) {
        // TODO: APP 内调起
        uni.showToast({ title: "APP 支付开发中", icon: "none" });
        return;
    }

    if (scene === UserTerminal.H5) {
        // TODO: H5 非公众号（如展示二维码等）
        uni.showToast({ title: "H5 支付开发中", icon: "none" });
        return;
    }

    uni.showToast({ title: "当前环境暂不支持微信支付", icon: "none" });
}

/** 调起支付宝支付（预留） */
async function launchAlipayPay(_prepaidInfo: PrepaidInfo, _scene: number): Promise<void> {
    // TODO: 支付宝 H5/小程序/APP 调起
    uni.showToast({ title: "支付宝支付开发中", icon: "none" });
}

/**
 * 拉起支付 Hook（微信 / 支付宝等）
 * - 微信：小程序已实现，H5/公众号/APP 预留
 * - 支付宝：预留
 */
export function usePay() {
    /**
     * 根据预支付结果和支付类型调起支付
     * @param prepaidInfo 预支付返回
     * @param payType 支付类型：1 微信 2 支付宝
     * @param scene 可选，不传则用 getTerminal()
     */
    async function launchPay(
        prepaidInfo: PrepaidInfo,
        payType: number,
        scene?: number,
    ): Promise<void> {
        const terminal = scene ?? getTerminal();

        if (payType === PayConfigPayType.WECHAT) {
            await launchWechatPay(prepaidInfo, terminal);
            return;
        }

        if (payType === PayConfigPayType.ALIPAY) {
            await launchAlipayPay(prepaidInfo, terminal);
            return;
        }

        uni.showToast({ title: "不支持的支付方式", icon: "none" });
    }

    return {
        launchPay,
    };
}
