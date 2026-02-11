import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Get, Param, Post, Put, Query } from "@nestjs/common";

import {
    AppsDecorateDto,
    BatchUpdateSortDto,
    QueryAppsDecorateItemsDto,
    UpdateItemDecorationDto,
} from "../../dto/apps-decorate.dto";
import { AppsDecorateService } from "../../services/apps-decorate.service";

/**
 * 应用中心装饰后台控制器
 * @description 处理应用中心运营位配置和应用装饰项的后台管理
 */
@ConsoleController("apps-decorate", "应用中心装饰内容")
export class AppsDecorateConsoleController extends BaseController {
    constructor(private readonly appsDecorateService: AppsDecorateService) {
        super();
    }

    /**
     * 获取应用中心装饰配置
     */
    @Get()
    @Permissions({ code: "get", name: "获取装饰内容", description: "获取应用中心装饰内容" })
    async get() {
        return await this.appsDecorateService.getConfig();
    }

    /**
     * 设置应用中心装饰配置
     */
    @Post()
    @Permissions({ code: "set", name: "设置装饰内容", description: "设置应用中心装饰内容" })
    async set(@Body() dto: AppsDecorateDto) {
        return await this.appsDecorateService.setConfig(dto);
    }

    /**
     * 分页查询应用装饰项列表
     */
    @Get("items")
    @Permissions({ code: "get", name: "获取装饰内容", description: "获取应用中心装饰内容" })
    @BuildFileUrl(["items.*.icon", "items.*.aliasIcon"])
    async getItems(@Query() query: QueryAppsDecorateItemsDto) {
        return await this.appsDecorateService.paginateItems({
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            keyword: query.keyword,
            tagId: query.tagId,
        });
    }

    /**
     * 更新单个应用装饰项
     */
    @Put("items/:extensionId")
    @Permissions({ code: "set", name: "设置装饰内容", description: "设置应用中心装饰内容" })
    async updateItem(
        @Param("extensionId") extensionId: string,
        @Body() dto: UpdateItemDecorationDto,
    ) {
        return await this.appsDecorateService.updateItemDecoration(extensionId, dto);
    }

    /**
     * 批量更新应用排序
     */
    @Post("items/sort")
    @Permissions({ code: "set", name: "设置装饰内容", description: "设置应用中心装饰内容" })
    async updateSort(@Body() dto: BatchUpdateSortDto) {
        return await this.appsDecorateService.batchUpdateSort(dto.items);
    }
}
