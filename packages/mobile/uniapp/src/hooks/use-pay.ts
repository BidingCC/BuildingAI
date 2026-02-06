/**
 * @fileoverview 拉起支付 Hook
 * @description 统一封装微信、支付宝等支付调起，按端区分：小程序已实现微信，H5/公众号/APP 预留
 */

import { PayConfigPayType, UserTerminal } from "@buildingai/constants";
import type { UserTerminalType } from "@buildingai/constants/shared/status-codes.constant";

import type { PrepaidInfo } from "@/service/pay";
import { getTerminal, isApp, isH5, isMpWeixin, isWechatOa } from "@/utils/env";

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
async function launchWechatPay(scene: UserTerminalType, prepaidInfo?: PrepaidInfo): Promise<void> {
    if (scene === UserTerminal.MP || isMpWeixin) {
        const timeStamp = prepaidInfo?.timeStamp;
        const nonceStr = prepaidInfo?.nonceStr;
        const packageVal = prepaidInfo?.package;
        const paySign = prepaidInfo?.paySign;
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
        return new Promise((resolve, reject) => {
            window.open(prepaidInfo?.h5_url, "_blank");
            resolve();
        });
    }

    uni.showToast({ title: "当前环境暂不支持微信支付", icon: "none" });
}

async function launchAlipayPay(_prepaidInfo: PrepaidInfo, _scene: UserTerminalType): Promise<void> {
    if (_scene === UserTerminal.H5) {
        return new Promise((resolve, reject) => {
            const payForm = _prepaidInfo?.payForm ?? "";
            const win = window.open("", "_blank");
            win?.document.write(payForm);
            win?.document.close();
            win?.document.forms[0]?.submit();
            resolve();
        });
    }
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
        scene?: UserTerminalType,
    ): Promise<void> {
        const terminal = scene ?? getTerminal();

        if (payType === PayConfigPayType.WECHAT) {
            await launchWechatPay(terminal, prepaidInfo);
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
