import { readFile } from "node:fs/promises";

import { AlipayService } from "@buildingai/alipay-sdk";
import {
    PayConfigPayType,
    type PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
import { DictCacheService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { WechatPayService } from "@buildingai/wechat-sdk";
import { PAY_EVENTS } from "@common/modules/pay/constants/pay-events.contant";
import { PayconfigService } from "@modules/system/services/payconfig.service";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

type PayServiceInstance = WechatPayService | AlipayService;

/**
 * 支付服务配置接口
 */
interface PayServiceConfig {
    appId: string;
    mchId: string;
    publicKey: string;
    privateKey: string;
    apiSecret: string;
    domain: string;
}

/**
 * 支付工厂服务
 *
 * 负责创建和管理不同支付类型的服务实例
 * 使用简单的Map缓存，避免重复创建实例
 *
 * 特性：
 * - 智能缓存：按支付类型缓存服务实例
 * - 按需创建：首次使用时创建实例
 * - 配置验证：确保配置完整性
 * - 错误处理：统一的异常处理
 * - 日志记录：详细的操作日志
 */
@Injectable()
export class PayfactoryService {
    private readonly logger = new Logger(PayfactoryService.name);

    /**
     * 支付服务实例缓存
     * Key: 支付类型
     * Value: 微信支付服务实例
     */
    private readonly serviceCache = new Map<PayConfigType, PayServiceInstance>();

    constructor(
        private readonly payconfigService: PayconfigService,
        private readonly dictCacheService: DictCacheService,
    ) {}

    /**
     * WechatPay
     */
    getPayService(payType: typeof PayConfigPayType.WECHAT): Promise<WechatPayService>;

    /**
     * Alipay
     */
    getPayService(payType: typeof PayConfigPayType.ALIPAY): Promise<AlipayService>;

    /**
     * 获取支付服务实例
     *
     * 优先从缓存获取，如果不存在则创建新实例
     *
     * @param payType 支付类型
     * @returns 支付服务实例
     * @throws 当服务创建失败时抛出异常
     */
    async getPayService(payType: PayConfigType): Promise<PayServiceInstance> {
        // 检查缓存中是否已存在该支付类型的服务实例
        if (this.serviceCache.has(payType)) {
            this.logger.debug(`使用缓存的支付服务实例: ${payType}`);
            return this.serviceCache.get(payType)!;
        }

        try {
            const domain = await this.getDomain();
            if (!domain) {
                throw HttpErrorFactory.badGateway("域名未配置，请在.env中配置APP_DOMAIN");
            }

            let service: PayServiceInstance;

            switch (payType) {
                case PayConfigPayType.WECHAT: {
                    // 获取配置
                    const config = await this.payconfigService.getPayconfig(
                        PayConfigPayType.WECHAT,
                    );
                    service = new WechatPayService({
                        appId: config.appId,
                        mchId: config.mchId,
                        publicKey: config.cert,
                        privateKey: config.paySignKey,
                        apiSecret: config.apiKey,
                        domain: domain,
                    });
                    break;
                }
                case PayConfigPayType.ALIPAY: {
                    const config = await this.payconfigService.getPayconfig(
                        PayConfigPayType.ALIPAY,
                    );
                    const res = {
                        appId: config.appId,
                        privateKey: config.privateKey,
                        gateway: config.gateway,
                        appCertContent: config.appCert,
                        alipayPublicCertContent: config.alipayPublicCert,
                        alipayRootCertContent: config.alipayRootCert,
                        useCert: true,
                    };
                    service = new AlipayService(res);
                    break;
                }
                default:
                    throw new Error(`Not supported: ${payType}`);
            }

            // 缓存服务实例
            this.serviceCache.set(payType, service);

            return service;
        } catch (error) {
            this.logger.error(`创建支付服务失败: ${payType}`, error);
            throw new Error(`支付服务创建失败: ${error.message}`);
        }
    }

    // /**
    //  * 获取支付服务配置
    //  *
    //  * @param payType 支付类型
    //  * @returns 支付服务配置
    //  */
    // private async getPayServiceConfig(payType: PayConfigType): Promise<PayServiceConfig> {
    //     const payconfig = await this.payconfigService.getPayconfig(payType);
    //     const domain = await this.getDomain();
    //
    //     if (!domain) {
    //         throw HttpErrorFactory.badGateway("域名未配置，请在.env中配置APP_DOMAIN");
    //     }
    //
    //     return {
    //         appId: payconfig.appId,
    //         mchId: payconfig.mchId,
    //         publicKey: payconfig.cert,
    //         privateKey: payconfig.paySignKey,
    //         apiSecret: payconfig.apiKey,
    //         domain,
    //     };
    // }

    /**
     * 获取域名配置
     *
     * @returns 域名
     */
    private async getDomain(): Promise<string> {
        const config = await this.dictCacheService.getGroupValues<{
            domain?: string;
        }>("storage_config");
        return config?.domain || process.env.APP_DOMAIN || "";
    }

    /**
     * 清除指定支付类型的缓存
     *
     * @param payType 支付类型
     */
    clearCache(payType: PayConfigType): void {
        this.serviceCache.delete(payType);
        this.logger.log(`支付服务缓存清除: ${payType}`);
    }

    /**
     * 清除所有缓存
     */
    clearAllCache(): void {
        this.serviceCache.clear();
        this.logger.log("清除所有支付服务缓存");
    }

    /**
     * 获取缓存统计信息
     *
     * @returns 缓存统计信息
     */
    getCacheStats(): { size: number; capacity: number } {
        return {
            size: this.serviceCache.size,
            capacity: 10, // 最大缓存数量
        };
    }

    /**
     * 获取所有缓存的支付类型
     *
     * @returns 已缓存的支付类型列表
     */
    getCachedPayTypes(): PayConfigType[] {
        return Array.from(this.serviceCache.keys());
    }

    /**
     * 检查指定支付类型是否已缓存
     *
     * @param payType 支付类型
     * @returns 是否已缓存
     */
    isCached(payType: PayConfigType): boolean {
        return this.serviceCache.has(payType);
    }
    /**
     * 监听支付配置更新事件
     *
     * @param payType 支付类型
     */
    @OnEvent(PAY_EVENTS.REFRESH, { async: true })
    handleOrderCreatedEvent(payType: PayConfigType) {
        this.clearCache(payType);
    }
}
