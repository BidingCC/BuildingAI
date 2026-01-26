import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Get } from "@nestjs/common";

import { AppsDecorateService } from "../../services/apps-decorate.service";

/**
 * 应用中心装饰前台控制器
 * @description 处理应用中心运营位配置的前台获取
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
    @BuildFileUrl(["**.heroImageUrl"])
    async get() {
        return await this.appsDecorateService.getConfig();
    }
}
