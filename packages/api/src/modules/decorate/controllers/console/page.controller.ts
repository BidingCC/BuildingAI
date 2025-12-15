import { DictService } from "@buildingai/dict";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { LayoutConfigDto } from "@modules/decorate/dto/layout.dto";
import { PageService } from "@modules/decorate/services/page.service";
import { PluginLinksService } from "@modules/decorate/services/plugin-links.service";
import { Body, Get, Param, Post, Query } from "@nestjs/common";

@ConsoleController("decorate-page", "布局配置")
export class PageConsoleController {
    constructor(
        private readonly pageService: PageService,
        private readonly pluginLinksService: PluginLinksService,
        private readonly dictService: DictService,
    ) {}

    /**
     * 根据类型获取布局配置
     * @param type 布局类型 (如: web)
     * @returns 布局配置
     */
    @Get("layout/:type")
    @Permissions({
        code: "get-layout",
        name: "获取布局配置",
        description: "根据类型获取布局配置",
    })
    async getLayoutByType(@Param("type") type: string) {
        const result = await this.pageService.findOne({
            where: { name: type },
        });

        if (!result) {
            // 如果不存在，返回默认配置
            return {
                data: { layout: "layout-1", menus: [] },
            };
        }

        // 直接返回 data 字段
        return {
            id: result.id,
            data: result.data || { layout: "layout-1", menus: [] },
        };
    }

    /**
     * 保存布局配置
     * @param type 布局类型 (如: web)
     * @param data 布局数据
     * @returns 保存结果
     */
    @Post("layout/:type")
    @Permissions({
        code: "save-layout",
        name: "保存布局配置",
        description: "保存布局配置",
    })
    async saveLayout(@Param("type") type: string, @Body() data: LayoutConfigDto) {
        // 先查找是否已存在该类型的配置
        const existing = await this.pageService.findOne({
            where: { name: type },
        });

        if (existing) {
            // 如果存在，更新配置
            const updated = await this.pageService.updateById(existing.id, {
                data: data,
            });
            return {
                id: updated.id,
                data: updated.data,
            };
        } else {
            // 如果不存在，创建新配置
            const newLayout = await this.pageService.create({
                name: type,
                data: data,
            });

            return {
                id: newLayout.id,
                data: newLayout.data,
            };
        }
    }

    /**
     * Get plugin links list
     * @returns Plugin links list
     */
    @Get("plugin-links")
    @Permissions({
        code: "get-plugin-links",
        name: "Get Plugin Links List",
        description: "Get all plugin links list",
    })
    async getPluginLinks() {
        try {
            const pluginLinks = await this.pluginLinksService.getPluginLinks();

            return {
                data: pluginLinks,
                total: pluginLinks.length,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                data: [],
                total: 0,
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * 获取 pages 配置
     * @param type 配置类型，固定为 '自定义'
     * @returns Pages 配置数据
     */
    @Get("pages")
    @Permissions({
        code: "get-pages-config",
        name: "获取 Pages 配置",
        description: "根据类型获取 Pages 配置",
    })
    async getPagesConfig(@Query("type") type: string = "自定义") {
        const key = `pages_${type}`;
        const group = "decorate";

        const config = await this.dictService.get<any>(key, {}, group);
        return config;
    }

    /**
     * 设置 pages 配置
     * @param type 配置类型，固定为 '自定义'
     * @param data 配置数据，由前端传递
     * @returns 保存结果
     */
    @Post("pages")
    @Permissions({
        code: "set-pages-config",
        name: "设置 Pages 配置",
        description: "根据类型设置 Pages 配置",
    })
    async setPagesConfig(@Query("type") type: string = "自定义", @Body() data: any) {
        const key = `pages_${type}`;
        const group = "decorate";

        await this.dictService.set(key, data, {
            group,
            description: `Pages 配置 - ${type}`,
        });

        // 返回更新后的配置
        const config = await this.dictService.get<any>(key, {}, group);
        return config;
    }
}
