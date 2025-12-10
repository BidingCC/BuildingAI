// 小程序微信登录事件类型
interface GetPhoneNumberEvent {
    detail: {
        cloudID?: string;
        code?: string;
        encryptedData?: string;
        iv?: string;
    };
}
