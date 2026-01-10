export interface SmsSendResult {
    success: boolean;
    message?: string;
    bizId?: string;
}

export interface SmsProvider {
    sendVerificationCode(
        phone: string,
        phoneAreaCode: string,
        code: string,
    ): Promise<SmsSendResult>;
}
