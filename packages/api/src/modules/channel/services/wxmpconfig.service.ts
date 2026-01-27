import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { WECHAT_EVENTS } from "@common/modules/wechat/constants/wechat.constant";
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { UpdateWxMpConfigDto } from "../dto/updatemp.dto";
import { WxMpConfig } from "../interface/wexmpconfig";

@Injectable()
export class WxMpConfigService extends BaseService<Dict> {
    constructor(
        private readonly dictService: DictService,
        @InjectRepository(Dict) repository: Repository<Dict>,
        private readonly dictCacheService: DictCacheService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super(repository);
    }

    /**
     * 获取小程序配置
     * @returns 小程序配置
     */
    async getConfig() {
        return await this.getGroupConfig<WxMpConfig>("wxmpconfig", {
            name: "BuildingAI",
            qrCode: "",
            originalId: "",
            appId: "",
            appSecret: "",
            uploadKey: "",
        });
    }

    /**
     * 更新小程序配置
     * @param config 小程序配置
     * @returns 更新后的小程序配置
     */
    async updateConfig(config: UpdateWxMpConfigDto) {
        await this.setGroupConfig("wxmpconfig", config);
        this.eventEmitter.emit(WECHAT_EVENTS.MP_CONFIG_REFRESH);
        return { success: true };
    }

    /**
     * 获取指定分组的配置
     * @param group 配置分组
     * @param defaultConfig 默认配置对象
     * @returns 配置对象
     */
    private async getGroupConfig<T = any>(group: string, defaultConfig: T): Promise<T> {
        try {
            const configs = await this.dictService.findAll({
                where: { group },
                order: { sort: "ASC" },
            });

            if (configs.length === 0) {
                return defaultConfig;
            }

            // 将配置转换为对象格式
            const result = {};
            for (const config of configs) {
                // 根据默认配置的类型来决定如何解析值
                const defaultValue = defaultConfig[config.key];
                result[config.key] = this.parseValue(config.value, defaultValue);
            }

            // 合并默认配置和实际配置，确保返回完整的配置对象
            return { ...defaultConfig, ...result } as T;
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
                    description: `小程序配置 - ${key}`,
                });
            }
        } catch (error) {
            this.logger.error(`更新分组 ${group} 的配置失败: ${error.message}`);
            throw error;
        }
    }
    /**
     * 将存储的字符串解析为适当的类型
     * @param value 存储的字符串值
     * @param defaultValue 默认值，用于判断目标类型
     * @returns 解析后的值
     */
    private parseValue<T = any>(value: string, defaultValue?: any): T {
        if (!value) {
            return null as unknown as T;
        }

        // 如果默认值是字符串类型，保持字符串类型，不进行数字解析
        if (typeof defaultValue === "string") {
            // 只解析 JSON 对象和数组，不解析数字
            try {
                if (
                    (value.startsWith("{") && value.endsWith("}")) ||
                    (value.startsWith("[") && value.endsWith("]"))
                ) {
                    return JSON.parse(value) as T;
                }
            } catch {
                // 解析失败，返回原始字符串
            }
            return value as unknown as T;
        }

        // 尝试解析为JSON
        try {
            // 判断是否可能是JSON
            if (
                (value.startsWith("{") && value.endsWith("}")) ||
                (value.startsWith("[") && value.endsWith("]")) ||
                value === "true" ||
                value === "false" ||
                value === "null" ||
                !isNaN(Number(value))
            ) {
                return JSON.parse(value) as T;
            }
        } catch {
            // 解析失败，忽略错误
        }

        // 如果不是JSON，返回原始字符串
        return value as unknown as T;
    }
}
