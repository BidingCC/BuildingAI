import { BaseController } from "@buildingai/base";
import { Public } from "@buildingai/decorators/public.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { WebController } from "@common/decorators/controller.decorator";
import { Get, Param } from "@nestjs/common";

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

        // 获取布局数据，如果不存在则使用默认值
        const layoutData = result.data || { layout: "layout-5", menus: [] };

        // 过滤隐藏的菜单项
        if (layoutData.menus && Array.isArray(layoutData.menus)) {
            layoutData.menus = layoutData.menus.filter((menu: any) => !menu.isHidden);
        }

        // 返回布局配置数据
        return {
            data: layoutData,
        };
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
}
