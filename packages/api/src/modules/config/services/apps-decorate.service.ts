import { ExtensionStatus } from "@buildingai/constants/shared/extension.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Extension } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";

const GROUP = "apps-decorate";
const CONFIG_KEY = "apps_decorate_config";
const CONFIG_FILE_URL_FIELDS = ["heroImageUrl", "banners.*.imageUrl"];

/**
 * 应用中心装饰链接项接口（向后兼容）
 */
export interface AppsDecorateLinkItem {
    type?: string;
    name?: string;
    path?: string;
    query?: Record<string, unknown>;
}

/**
 * Banner 项接口
 */
export interface AppsDecorateBannerItem {
    imageUrl: string;
    linkUrl?: string;
}

/**
 * 应用中心装饰配置接口
 */
export interface AppsDecorateConfig {
    enabled: boolean;
    title: string;
    description: string;
    /**
     * Banner 列表（优先使用此字段）
     */
    banners?: AppsDecorateBannerItem[];
    /**
     * 单个链接配置（向后兼容，已废弃）
     * @deprecated 使用 banners 字段替代
     */
    link?: AppsDecorateLinkItem;
    /**
     * 单个图片 URL（向后兼容，已废弃）
     * @deprecated 使用 banners 字段替代
     */
    heroImageUrl?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppsDecorateConfig = {
    enabled: false,
    title: "",
    description: "",
    banners: [],
};

/**
 * 应用中心装饰服务
 * @description 处理应用中心运营位配置和应用装饰项的获取和设置
 */
@Injectable()
export class AppsDecorateService {
    constructor(
        private readonly dictService: DictService,
        @InjectRepository(Extension)
        private readonly extensionRepo: Repository<Extension>,
    ) {}

    // ==================== 页面配置（dict 存储） ====================

    /**
     * 获取应用中心装饰配置
     */
    async getConfig(): Promise<AppsDecorateConfig> {
        const stored = await this.dictService.get<Partial<AppsDecorateConfig>>(
            CONFIG_KEY,
            undefined,
            GROUP,
            { restoreFileUrlFields: CONFIG_FILE_URL_FIELDS },
        );

        const config: AppsDecorateConfig = { ...DEFAULT_CONFIG, ...(stored || {}) };

        // 向后兼容：如果存在 heroImageUrl 但没有 banners，转换为 banners 格式
        if (!config.banners || config.banners.length === 0) {
            if (config.heroImageUrl) {
                config.banners = [
                    {
                        imageUrl: config.heroImageUrl,
                        linkUrl: config.link?.path,
                    },
                ];
            } else {
                config.banners = [];
            }
        }

        return config;
    }

    /**
     * 设置应用中心装饰配置
     */
    async setConfig(
        payload: Partial<AppsDecorateConfig> & Pick<AppsDecorateConfig, "enabled" | "title">,
    ): Promise<AppsDecorateConfig> {
        const configToSave: AppsDecorateConfig = {
            enabled: payload.enabled,
            title: payload.title,
            description: payload.description ?? "",
        };

        if (payload.banners && payload.banners.length > 0) {
            configToSave.banners = payload.banners;
        } else if (payload.heroImageUrl) {
            configToSave.banners = [
                {
                    imageUrl: payload.heroImageUrl,
                    linkUrl: payload.link?.path,
                },
            ];
        } else {
            configToSave.banners = [];
        }

        await this.dictService.set(CONFIG_KEY, configToSave, {
            group: GROUP,
            description: "apps-decorate 配置",
            normalizeFileUrlFields: CONFIG_FILE_URL_FIELDS,
        });

        return this.getConfig();
    }

    /**
     * 分页查询应用装饰项
     */
    async paginateItems(query: {
        page: number;
        pageSize: number;
        keyword?: string;
        tagId?: string;
    }) {
        const qb = this.extensionRepo.createQueryBuilder("ext");

        // 仅查询已启用的扩展
        qb.where("ext.status = :status", { status: ExtensionStatus.ENABLED });

        if (query.keyword) {
            qb.andWhere(
                "(ext.name ILIKE :keyword OR ext.identifier ILIKE :keyword OR ext.alias ILIKE :keyword)",
                { keyword: `%${query.keyword}%` },
            );
        }

        if (query.tagId) {
            // PostgreSQL jsonb 包含查询
            qb.andWhere("ext.appCenterTagIds @> :tagIds::jsonb", {
                tagIds: JSON.stringify([query.tagId]),
            });
        }

        qb.orderBy("ext.appCenterSort", "ASC", "NULLS LAST").addOrderBy("ext.created_at", "DESC");

        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        qb.skip((page - 1) * pageSize).take(pageSize);

        const [items, total] = await qb.getManyAndCount();
        const totalPages = Math.ceil(total / pageSize);

        return { items, total, page, pageSize, totalPages };
    }

    /**
     * 更新单个应用装饰项
     */
    async updateItemDecoration(
        extensionId: string,
        dto: {
            alias?: string;
            aliasDescription?: string;
            aliasIcon?: string;
            aliasShow?: boolean;
            appCenterTagIds?: string[];
            appCenterSort?: number;
        },
    ) {
        const updateData: Record<string, any> = {};
        if (dto.alias !== undefined) updateData.alias = dto.alias;
        if (dto.aliasDescription !== undefined) updateData.aliasDescription = dto.aliasDescription;
        if (dto.aliasIcon !== undefined) updateData.aliasIcon = dto.aliasIcon;
        if (dto.aliasShow !== undefined) updateData.aliasShow = dto.aliasShow;
        if (dto.appCenterTagIds !== undefined) updateData.appCenterTagIds = dto.appCenterTagIds;
        if (dto.appCenterSort !== undefined) updateData.appCenterSort = dto.appCenterSort;

        await this.extensionRepo.update(extensionId, updateData as any);
        return this.extensionRepo.findOneBy({ id: extensionId });
    }

    /**
     * 批量更新排序
     */
    async batchUpdateSort(items: { id: string; sort: number }[]) {
        await Promise.all(
            items.map((item) =>
                this.extensionRepo.update(item.id, { appCenterSort: item.sort } as any),
            ),
        );
        return { success: true };
    }
}
