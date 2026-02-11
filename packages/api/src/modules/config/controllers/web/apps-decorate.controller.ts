import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Get, Query } from "@nestjs/common";

import { QueryAppsDecorateItemsDto } from "../../dto/apps-decorate.dto";
import { AppsDecorateService } from "../../services/apps-decorate.service";

/**
 * 应用中心装饰前台控制器
 * @description 处理应用中心运营位配置和装饰项的前台获取
 */
@WebController("apps-decorate")
export class AppsDecorateWebController extends BaseController {
    constructor(private readonly appsDecorateService: AppsDecorateService) {
        super();
    }

    /**
     * 获取应用中心装饰配置（公开接口）
     */
    @Get()
    @Public()
    @BuildFileUrl(["**.heroImageUrl", "banners.*.imageUrl"])
    async get() {
        return await this.appsDecorateService.getConfig();
    }

    /**
     * 分页查询应用装饰项（公开接口）
     */
    @Get("items")
    @Public()
    @BuildFileUrl(["items.*.icon", "items.*.aliasIcon"])
    async getItems(@Query() query: QueryAppsDecorateItemsDto) {
        return await this.appsDecorateService.paginateItems({
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            keyword: query.keyword,
            tagId: query.tagId,
        });
    }
}
