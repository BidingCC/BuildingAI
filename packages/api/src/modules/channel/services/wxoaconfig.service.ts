import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities/dict.entity";
import { Repository } from "@buildingai/db/typeorm";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { WECHAT_EVENTS } from "@common/modules/wechat/constants/wechat.constant";
import { UpdateWxOaConfigDto } from "@modules/channel/dto/updatewx.dto";
import {
    MessageEncryptType,
    messageEncryptType,
} from "@modules/channel/interface/wxoaconfig.constant";
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
/**
 * 存储配置接口
 */
export interface StorageConfig {
    /** 域名 */
    domain?: string;
}
export type WxOaConfig = {
    appId: string;
    appSecret: string;
    url: string;
    token: string;
    encodingAESKey: string;
    messageEncryptType: MessageEncryptType;
    domain: string;
    jsApiDomain: string;
    webAuthDomain: string;
};
@Injectable()
export class WxOaConfigService extends BaseService<Dict> {
    private readonly SuffixUrl: string = "/api/auth/wechat-callback";
    constructor(
        private readonly dictService: DictService,
        @InjectRepository(Dict) repository: Repository<Dict>,
        private readonly dictCacheService: DictCacheService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super(repository);
    }

    /**
     * 获取公众号配置
     * @returns 公众号配置
     */
    async getConfig() {
        const { domain } = await this.getDomain();
        return await this.getGroupConfig<WxOaConfig>("wxoaconfig", {
            appId: "",
            appSecret: "",
            url: domain + this.SuffixUrl,
            token: "",
            encodingAESKey: "",
            messageEncryptType: messageEncryptType.plain,
            domain: domain,
            jsApiDomain: domain,
            webAuthDomain: domain,
        });
    }

    /**
     * 更新公众号配置
     * @param config 公众号配置
     * @returns 更新后的公众号配置
     */
    async updateConfig(config: UpdateWxOaConfigDto) {
        await this.setGroupConfig("wxoaconfig", config);
        this.eventEmitter.emit(WECHAT_EVENTS.REFRESH);
        return { success: true };
    }

    private async getGroupConfig<T = any>(group: string, defaultConfig: T): Promise<T> {
        try {
            const { domain } = await this.getDomain();

            const configs = await this.dictService.findAll({
                where: { group },
            });
            if (configs.length === 0) {
                return defaultConfig;
            }

            const result: WxOaConfig = {
                appId: "",
                appSecret: "",
                url: "",
                token: "",
                encodingAESKey: "",
                messageEncryptType: messageEncryptType.plain,
                domain: "",
                jsApiDomain: "",
                webAuthDomain: "",
            };
            for (const config of configs) {
                result[config.key] = config.value;
            }

            // 使用对象展开语法和计算属性，一次性设置所有域名相关字段
            return {
                ...result,
                domain,
                jsApiDomain: domain,
                webAuthDomain: domain,
                url: domain + this.SuffixUrl,
            } as T;
        } catch (error) {
            this.logger.error(`获取分组 ${group} 的配置失败: ${error.message}`);
            return defaultConfig;
        }
    }

    private async setGroupConfig(group: string, data: Record<string, any>) {
        try {
            for (const [key, value] of Object.entries(data)) {
                await this.dictService.set(key, value, {
                    group,
                    description: `公众号配置 - ${key}`,
                });
            }
        } catch (error) {
            this.logger.error(`更新分组 ${group} 的配置失败: ${error.message}`);
            throw error; // 将错误向上抛出，便于控制器处理
        }
    }

    /**
     * 获取存储配置
     *
     * @returns 存储配置对象
     */
    private async getDomain(): Promise<StorageConfig> {
        const config = await this.dictCacheService.getGroupValues<StorageConfig>("storage_config");
        return {
            domain: config?.domain || process.env.APP_DOMAIN,
        };
    }
}
