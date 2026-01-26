import { BaseController } from "@buildingai/base";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Get, Post } from "@nestjs/common";

import { AppsDecorateDto } from "../../dto/apps-decorate.dto";
import { AppsDecorateService } from "../../services/apps-decorate.service";

/**
 * 应用中心装饰后台控制器
 * @description 处理应用中心运营位配置的后台管理
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
}
