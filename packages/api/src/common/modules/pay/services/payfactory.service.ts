import { AlipayService } from "@buildingai/alipay-sdk";
import {
    PayConfigPayType,
    type PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
import { PayConfigPayTypeReverse } from "@buildingai/constants/shared/payconfig.constant";
import { UserTerminalType } from "@buildingai/constants/shared/status-codes.constant";
import { UserTerminalReverse } from "@buildingai/constants/shared/status-codes.constant";
import { UserTerminal } from "@buildingai/constants/shared/status-codes.constant";
import { DictCacheService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { WechatPayService } from "@buildingai/wechat-sdk";
import type { PAY_SCENE } from "@common/modules/pay/constants/pay-events.contant";
import {
    PAY_EVENTS,
    PAY_SCENE_CACHE_KEYS_BY_PAY_TYPE,
    PAY_SCENE_MAP,
} from "@common/modules/pay/constants/pay-events.contant";
import { WxMpConfigService } from "@modules/channel/services/wxmpconfig.service";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { PayconfigService } from "@modules/system/services/payconfig.service";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
type PayServiceInstance = WechatPayService | AlipayService;

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
    private readonly serviceCache = new Map<PAY_SCENE, PayServiceInstance>();

    constructor(
        private readonly payconfigService: PayconfigService,
        private readonly dictCacheService: DictCacheService,
        private readonly wxOaConfigService: WxOaConfigService,
        private readonly wxMpConfigService: WxMpConfigService,
    ) {}

    /**
     * WechatPay
     */
    getPayService(
        payType: typeof PayConfigPayType.WECHAT,
        scene?: UserTerminalType,
    ): Promise<WechatPayService>;

    /**
     * Alipay
     */
    getPayService(
        payType: typeof PayConfigPayType.ALIPAY,
        scene?: UserTerminalType,
    ): Promise<AlipayService>;

    /**
     * 获取支付服务实例
     *
     * 优先从缓存获取，如果不存在则创建新实例
     *
     * @param payType 支付类型
     * @returns 支付服务实例
     * @throws 当服务创建失败时抛出异常
     */
    async getPayService(
        payType: PayConfigType,
        scene: UserTerminalType = UserTerminal.PC,
    ): Promise<PayServiceInstance> {
        // 检查缓存中是否已存在该支付类型的服务实例
        const cacheKey =
            PAY_SCENE_MAP[PayConfigPayTypeReverse[payType]][UserTerminalReverse[scene]];
        if (this.serviceCache.has(cacheKey)) {
            // this.logger.debug(`使用缓存的支付服务实例: ${cacheKey}`);
            return this.serviceCache.get(cacheKey)!;
        }

        try {
            const domain = await this.getDomain();
            if (!domain) {
                throw HttpErrorFactory.badGateway("域名未配置，请在.env中配置APP_DOMAIN");
            }

            let service: PayServiceInstance;

            switch (payType) {
                case PayConfigPayType.WECHAT: {
                    // 支付配置（商户号、证书、密钥等）
                    const config = await this.payconfigService.getPayconfig(
                        PayConfigPayType.WECHAT,
                    );
                    // 公众号渠道配置（appId 等）
                    let appId = "";
                    if (
                        scene === UserTerminal.PC ||
                        scene === UserTerminal.H5 ||
                        scene === UserTerminal.OA
                    ) {
                        appId = (await this.wxOaConfigService.getConfig()).appId;
                    } else if (scene === UserTerminal.MP) {
                        appId = (await this.wxMpConfigService.getConfig()).appId;
                    } else if (scene === UserTerminal.APP) {
                        //TODO: 获取APP配置
                        appId = (await this.wxOaConfigService.getConfig()).appId;
                    } else {
                        throw HttpErrorFactory.badRequest("不支持的支付场景");
                    }
                    service = new WechatPayService({
                        appId,
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
            this.serviceCache.set(cacheKey, service);

            return service;
        } catch (error) {
            this.logger.error(`创建支付服务失败: ${payType}`, error);
            throw new Error(`支付服务创建失败: ${error.message}`);
        }
    }

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
    clearCache(cacheKey: PAY_SCENE): void {
        this.serviceCache.delete(cacheKey);
        this.logger.log(`支付服务缓存清除: ${cacheKey}`);
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
     * 监听支付配置更新事件，按 payType 清理对应场景缓存（数据来源于 PAY_SCENE_MAP）
     *
     * @param payType 支付类型
     */
    @OnEvent(PAY_EVENTS.REFRESH, { async: true })
    handlePayConfigRefresh(payType: PayConfigType) {
        const payTypeKey = PayConfigPayTypeReverse[payType];
        const keysToClear = PAY_SCENE_CACHE_KEYS_BY_PAY_TYPE[payTypeKey];
        if (keysToClear) {
            keysToClear.forEach((key) => this.clearCache(key));
        }
    }
}
