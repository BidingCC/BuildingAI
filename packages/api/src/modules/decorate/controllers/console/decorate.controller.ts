import { DictService } from "@buildingai/dict";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { PluginLinksService } from "@modules/decorate/services/plugin-links.service";
import { Body, Get, Put } from "@nestjs/common";

const DICT_GROUP = "decorate";
const DICT_KEY = "menu-config";

export interface DecorateMenuLink {
    label: string;
    path: string;
    type: "system" | "extension" | "custom" | "button";
    query: Record<string, string>;
    component: string | null;
    target: "_self" | "_blank";
}

export interface DecorateMenuItem {
    id: string;
    icon: string;
    title: string;
    link: DecorateMenuLink;
    isHidden?: boolean;
}

export interface DecorateMenuConfig {
    layout: string;
    menus: DecorateMenuItem[];
}

const DEFAULT_CONFIG: DecorateMenuConfig = {
    layout: "default",
    menus: [],
};

@ConsoleController("decorate-page", "布局配置")
export class DecorateConsoleController {
    constructor(
        private readonly pluginLinksService: PluginLinksService,
        private readonly dictService: DictService,
    ) {}

    /**
     * Get menu config
     * @returns Menu config
     */
    @Get("menu")
    @Permissions({
        code: "get-menu-config",
        name: "获取菜单配置",
    })
    async getMenuConfig() {
        const stored = await this.dictService.get<Partial<DecorateMenuConfig>>(
            DICT_KEY,
            undefined,
            DICT_GROUP,
        );
        return { data: { ...DEFAULT_CONFIG, ...(stored || {}) } };
    }

    /**
     * Set menu config
     * @param payload Menu config
     * @returns Updated menu config
     */
    @Put("menu")
    @Permissions({
        code: "set-menu-config",
        name: "设置菜单配置",
    })
    async setMenuConfig(@Body() payload: DecorateMenuConfig) {
        await this.dictService.set(DICT_KEY, payload, {
            group: DICT_GROUP,
            description: "前台菜单配置",
        });
        return this.getMenuConfig();
    }

    /**
     * Get plugin links list
     * @returns Plugin links list
     */
    @Get("plugin-links")
    @Permissions({
        code: "get-plugin-links",
        name: "获取插件链接",
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
}
