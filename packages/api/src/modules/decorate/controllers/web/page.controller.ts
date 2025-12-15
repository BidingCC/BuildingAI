import { BaseController } from "@buildingai/base";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { WebController } from "@common/decorators/controller.decorator";
import { Get, Param, Query } from "@nestjs/common";

import { PagesConfigDto } from "../../../decorate/dto/pages-config.dto";
import { MicropageService } from "../../../decorate/services/micropage.service";
import { PageService } from "../../../decorate/services/page.service";

/**
 * 前台装修页面控制器
 *
 * 提供前台布局配置和微页面的查询功能
 */
@WebController("decorate-page")
export class PageWebController extends BaseController {
    constructor(
        private readonly pageService: PageService,
        private readonly micropageService: MicropageService,
        private readonly dictService: DictService,
    ) {
        super();
    }

    /**
     * 获取前台布局配置
     * @param type 布局类型 (如: web)
     * @returns 布局配置
     */
    @Get("layout/:type")
    @Public()
    async getLayoutByType(@Param("type") type: string) {
        const result = await this.pageService.findOne({
            where: { name: type },
        });

        if (!result) {
            // 如果不存在，返回默认配置
            return {
                data: { layout: "layout-5", menus: [] },
            };
        }

        // 返回布局配置数据
        return result;
    }

    /**
     * 获取微页面详情
     * @param id 微页面ID
     * @returns 微页面信息
     */
    @Get("micropage/:id")
    @Public()
    async getMicropageDetail(@Param("id", UUIDValidationPipe) id: string) {
        const result = await this.micropageService.findOneById(id, {
            excludeFields: ["page_type", "source"],
        });
        if (!result) {
            throw HttpErrorFactory.notFound("微页面不存在");
        }
        return result;
    }

    /**
     * 获取 pages 配置（前台公开接口）
     * @param type 配置类型，固定为 '自定义'
     * @returns Pages 配置数据
     */
    @Get("pages")
    @Public()
    async getPagesConfig(@Query("type") type: string = "自定义") {
        const key = `pages_${type}`;
        const group = "decorate";

        const config = await this.dictService.get<any>(key, {}, group);
        return config;
    }
}
