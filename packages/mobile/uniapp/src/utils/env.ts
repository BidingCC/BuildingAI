export {
    isApp,
    isAppAndroid,
    isAppHarmony,
    isAppIOS,
    isAppPlus,
    isH5,
    isMp,
    isMpAlipay,
    isMpWeixin,
    isWeb,
} from "@uni-helper/uni-env";
import { UserTerminal } from "@buildingai/constants";

export const isMiniProgram = (() => {
    // #ifdef H5
    const userAgent = navigator.userAgent;
    if (/miniProgram/i.test(userAgent) && /micromessenger/i.test(userAgent)) {
        return true;
    } else {
        return false;
    }
    // #endif
    // #ifndef H5
    return false;
    // #endif
})();

export const isWechatOa = (() => {
    // #ifdef H5
    return /MicroMessenger/i.test(navigator.userAgent);
    // #endif
    // #ifndef H5
    return false;
    // #endif
})();

export const getTerminal = () => {
    // #ifdef H5
    return UserTerminal.H5;
    // #endif
    // #ifdef MP
    return UserTerminal.MP;

    // #endif
    // #ifdef APP-PLUS
    return UserTerminal.APP;
    // #endif
};

export function isDevMode(): boolean {
    return import.meta.env.DEV;
}

export function isProdMode(): boolean {
    return import.meta.env.PROD;
}
