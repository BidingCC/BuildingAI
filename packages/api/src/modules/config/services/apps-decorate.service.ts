import { DictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";

const GROUP = "apps-decorate";
const KEY = "apps_decorate_config";
const FILE_URL_FIELDS = ["heroImageUrl"];

/**
 * 应用中心装饰链接项接口
 */
export interface AppsDecorateLinkItem {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
}

/**
 * 应用中心装饰配置接口
 */
export interface AppsDecorateConfig {
    enabled: boolean;
    title: string;
    link: AppsDecorateLinkItem;
    heroImageUrl: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppsDecorateConfig = {
    enabled: false,
    title: "",
    link: {},
    heroImageUrl: "",
};

/**
 * 应用中心装饰服务
 * @description 处理应用中心运营位配置的获取和设置
 */
@Injectable()
export class AppsDecorateService {
    constructor(private readonly dictService: DictService) {}

    /**
     * 获取应用中心装饰配置
     * @returns 应用中心装饰配置
     */
    async getConfig(): Promise<AppsDecorateConfig> {
        const stored = await this.dictService.get<Partial<AppsDecorateConfig>>(
            KEY,
            undefined,
            GROUP,
            { restoreFileUrlFields: FILE_URL_FIELDS },
        );
        return { ...DEFAULT_CONFIG, ...(stored || {}) } as AppsDecorateConfig;
    }

    /**
     * 设置应用中心装饰配置
     * @param payload 配置数据
     * @returns 更新后的配置
     */
    async setConfig(payload: AppsDecorateConfig): Promise<AppsDecorateConfig> {
        await this.dictService.set(KEY, payload, {
            group: GROUP,
            description: "apps-decorate 配置",
            normalizeFileUrlFields: FILE_URL_FIELDS,
        });
        return this.getConfig();
    }
}
