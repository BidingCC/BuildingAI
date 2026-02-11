import { BaseController } from "@buildingai/base";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { WebController } from "@common/decorators/controller.decorator";
import { Get } from "@nestjs/common";

/**
 * 前台装修页面控制器
 *
 * 提供前台布局配置和微页面的查询功能
 */
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

@WebController("decorate")
export class DecorateWebController extends BaseController {
    constructor(private readonly dictService: DictService) {
        super();
    }

    @Get("menu")
    @Public()
    async getDecorateMenuConfig() {
        const stored = await this.dictService.get<Partial<DecorateMenuConfig>>(
            DICT_KEY,
            undefined,
            DICT_GROUP,
        );

        const config = { ...DEFAULT_CONFIG, ...(stored || {}) };

        if (config.menus && Array.isArray(config.menus)) {
            config.menus = config.menus.filter((menu) => !menu.isHidden);
        }

        return config;
    }
}
