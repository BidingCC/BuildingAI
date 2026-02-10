// 小程序微信登录事件类型
interface GetPhoneNumberEvent {
    detail: {
        cloudID?: string;
        code?: string;
        encryptedData?: string;
        iv?: string;
    };
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wxs: any;
    }
}
declare interface Window {
    entryUrl: string;
}
declare interface Wx {
    config: (config: {
        debug?: boolean;
        appId: string;
        timestamp: string;
        nonceStr: string;
        signature: string;
        jsApiList: string[];
    }) => void;
    ready: (callback: () => void) => void;
    error: (callback: (res: { errMsg: string }) => void) => void;
    chooseWXPay: (config: {
        timestamp: string;
        nonceStr: string;
        package: string;
        signType: string;
        paySign: string;
        success: () => void;
        fail: () => void;
        cancel: () => void;
    }) => void;
}

declare const wx: Wx;
