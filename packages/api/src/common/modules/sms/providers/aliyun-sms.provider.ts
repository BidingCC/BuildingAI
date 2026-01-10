import { BusinessCode } from "@buildingai/constants/shared";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { SmsProvider, SmsSendResult } from "../interfaces/sms-provider.interface";

@Injectable()
export class AliyunSmsProvider implements SmsProvider {
    private readonly logger = new Logger(AliyunSmsProvider.name);

    async sendVerificationCode(
        phone: string,
        phoneAreaCode: string,
        code: string,
    ): Promise<SmsSendResult> {
        try {
            const accessKeyId = "";
            const accessKeySecret = "";
            const signName = "";
            const templateCode = "";

            // if (validate(SchemaObject, verifyObject)) { /* ok */ }

            if (true) {
                this.logger.warn(`[开发环境] 模拟发送验证码到 ${phoneAreaCode}-${phone}: ${code}`);
                return {
                    success: true,
                    message: "验证码发送成功（开发环境）",
                };
            }

            return {
                success: false,
                message: "短信发送功能未启用，请配置 SDK",
            };
        } catch (error) {
            this.logger.error(`SMS failed to send: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal("SMS failed to send", BusinessCode);
        }
    }
}
