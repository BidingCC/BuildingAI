import crypto from "node:crypto";

import { RedisService } from "@buildingai/cache";
import { type SmsSceneType } from "@buildingai/constants/shared";
import { HttpErrorFactory } from "@buildingai/errors";
import { isDevelopment } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";

import { SmsSendResult } from "../interfaces/sms-provider.interface";

@Injectable()
export class SmsService {
    private readonly CACHE_PREFIX = "sms";

    private readonly CODE_PREFIX_TIME = 5 * 60;
    private readonly CODE_RESEND_LIMIT = 60;
    private readonly CODE_LENGTH = 6;

    private readonly logger = new Logger(SmsService.name);

    constructor(private readonly redisService: RedisService) {}

    private generateCode(length: number) {
        let result = "";
        for (let i = 0; i < length; i++) {
            result += crypto.randomInt(0, 10);
        }
        return result;
    }

    private getCacheKey(phone: string, areaCode: string, scene: SmsSceneType) {
        return `${this.CACHE_PREFIX}:${scene}:${areaCode}-${phone}`;
    }

    private getRateLimitKey(phone: string, areaCode: string, scene: SmsSceneType) {
        const today = new Date().toISOString().split("T")[0];
        return `${this.CACHE_PREFIX}:limit:${areaCode}-${phone}:${today}`;
    }

    private async checkRateLimit(phone: string, areaCode: string, scene: SmsSceneType) {
        const key = this.getRateLimitKey(phone, areaCode, scene);
        const count = await this.redisService.incr(key);

        if (count === 1) {
            await this.redisService.expire(key, this.CODE_PREFIX_TIME);
        }

        const limit = 10;
        if (count > limit) {
            throw HttpErrorFactory.tooManyRequests();
        }
    }

    private getTemplateCode(scene: SmsSceneType) {
        return "";
    }

    async verifyCode(phone: string, areaCode: string, code: string, scene: SmsSceneType) {
        const key = this.getCacheKey(phone, areaCode, scene);
        const storedCode = await this.redisService.get<string>(key);

        if (!storedCode || storedCode !== code) {
            throw HttpErrorFactory.badRequest("The CAPTCHA has expired or does not exist");
        }

        await this.redisService.del(key);

        return true;
    }

    async clearCode(phone: string, areaCode: string, scene: SmsSceneType) {
        const key = this.getCacheKey(phone, areaCode, scene);
        await this.redisService.del(key);
    }

    async sendCode(phone: string, areaCode: string, scene: SmsSceneType): Promise<SmsSendResult> {
        try {
            await this.checkRateLimit(phone, areaCode, scene);
            const key = this.getCacheKey(phone, areaCode, scene);
            const ttl = await this.redisService.ttl(key);

            // 验证码有效期：5 分钟（300 秒）
            // 如果验证码还剩 4 分钟以上（240 秒），说明刚发送不久
            const threshold = this.CODE_PREFIX_TIME - this.CODE_RESEND_LIMIT;
            if (ttl > threshold) {
                throw HttpErrorFactory.tooManyRequests(`Please try again after ${ttl} seconds`);
            }

            const code = this.generateCode(this.CODE_LENGTH);

            if (!isDevelopment()) {
                await this.sendSmsViaProvider();
            }

            await this.redisService.set(key, code, this.CODE_PREFIX_TIME);

            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to send code ${phone}, ${scene}`);
            throw error;
        }
    }

    private async sendSmsViaProvider() {}
}
