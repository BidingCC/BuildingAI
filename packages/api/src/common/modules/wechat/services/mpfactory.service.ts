import { HttpErrorFactory } from "@buildingai/errors";
import { WechatMpClient } from "@buildingai/wechat-sdk";
import { WxMpConfigService } from "@modules/channel/services/wxmpconfig.service";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { WECHAT_EVENTS } from "../constants/wechat.constant";

/**
 * 微信小程序客户端配置接口
 */
interface WechatMpClientConfig {
    appId: string;
    appSecret: string;
}

/**
 * 微信小程序客户端工厂服务
 *
 * 负责创建和管理微信小程序客户端实例
 * 使用简单的Map缓存，避免重复创建实例
 *
 * 特性：
 * - 智能缓存：按标识符缓存客户端实例
 * - 按需创建：首次使用时创建实例
 * - 配置验证：确保配置完整性
 * - 错误处理：统一的异常处理
 * - 日志记录：详细的操作日志
 */
@Injectable()
export class WechatMpClientFactory {
    private readonly logger = new Logger(WechatMpClientFactory.name);

    /**
     * 微信小程序客户端实例缓存
     * Key: 客户端标识符（默认使用 "default"）
     * Value: 微信小程序客户端实例
     */
    private readonly clientCache = new Map<string, WechatMpClient>();

    /**
     * 默认客户端标识符
     */
    private readonly DEFAULT_CLIENT_KEY = "MP-DEFAULT";

    constructor(private readonly wxMpConfigService: WxMpConfigService) {}

    /**
     * 获取微信小程序客户端实例
     *
     * 优先从缓存获取，如果不存在则创建新实例
     *
     * @param clientKey 客户端标识符，可选，默认为 "MP-DEFAULT"
     * @returns 微信小程序客户端实例
     * @throws 当服务创建失败时抛出异常
     */
    async getClient(clientKey: string = this.DEFAULT_CLIENT_KEY): Promise<WechatMpClient> {
        // 检查缓存中是否已存在该标识符的客户端实例
        if (this.clientCache.has(clientKey)) {
            this.logger.debug(`使用缓存的微信小程序客户端实例: ${clientKey}`);
            return this.clientCache.get(clientKey)!;
        }

        try {
            // 获取配置
            const config = await this.getWechatMpClientConfig();
            // 创建客户端实例
            const wechatMpClient = new WechatMpClient(config.appId, config.appSecret);

            // 缓存客户端实例
            this.clientCache.set(clientKey, wechatMpClient);

            this.logger.log(`创建微信小程序客户端实例: ${clientKey}`);
            return wechatMpClient;
        } catch (error) {
            this.logger.error(`创建微信小程序客户端失败: ${clientKey}`, error);
            throw new Error(`微信小程序客户端创建失败: ${error.message}`);
        }
    }

    /**
     * 获取微信小程序客户端配置
     *
     * @returns 微信小程序客户端配置
     */
    private async getWechatMpClientConfig(): Promise<WechatMpClientConfig> {
        const config = await this.wxMpConfigService.getConfig();

        if (!config.appId) {
            throw HttpErrorFactory.badGateway("小程序 appId 未配置，请先配置小程序信息");
        }

        if (!config.appSecret) {
            throw HttpErrorFactory.badGateway("小程序 appSecret 未配置，请先配置小程序信息");
        }

        return {
            appId: config.appId,
            appSecret: config.appSecret,
        };
    }

    /**
     * 清除指定标识符的缓存
     *
     * @param clientKey 客户端标识符，可选，默认为 "default"
     */
    clearCache(clientKey: string = this.DEFAULT_CLIENT_KEY): void {
        this.clientCache.delete(clientKey);
        this.logger.log(`微信小程序客户端缓存清除: ${clientKey}`);
    }

    /**
     * 清除所有缓存
     */
    clearAllCache(): void {
        this.clientCache.clear();
        this.logger.log("清除所有微信小程序客户端缓存");
    }

    /**
     * 获取缓存统计信息
     *
     * @returns 缓存统计信息
     */
    getCacheStats(): { size: number; capacity: number } {
        return {
            size: this.clientCache.size,
            capacity: 10, // 最大缓存数量
        };
    }

    /**
     * 获取所有缓存的客户端标识符
     *
     * @returns 已缓存的客户端标识符列表
     */
    getCachedClientKeys(): string[] {
        return Array.from(this.clientCache.keys());
    }

    /**
     * 检查指定标识符是否已缓存
     *
     * @param clientKey 客户端标识符，可选，默认为 "default"
     * @returns 是否已缓存
     */
    isCached(clientKey: string = this.DEFAULT_CLIENT_KEY): boolean {
        return this.clientCache.has(clientKey);
    }

    /**
     * 监听小程序配置更新事件
     *
     * 当小程序配置更新时，清除缓存以使用新配置
     */
    @OnEvent(WECHAT_EVENTS.MP_CONFIG_REFRESH, { async: true })
    handleMpConfigRefresh() {
        this.clearAllCache();
        this.logger.log("小程序配置已更新，已清除所有客户端缓存");
    }
}
