import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Permissions } from "@common/decorators";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { UpdateWxMpConfigDto } from "@modules/channel/dto/updatemp.dto";
import { WxMpConfigService } from "@modules/channel/services/wxmpconfig.service";
import { Body, Get, Patch } from "@nestjs/common";
@ConsoleController("wxmpconfig", "公众号配置")
export class WxMpConfigConsoleController extends BaseController {
    constructor(private readonly wxmpconfigService: WxMpConfigService) {
        super();
    }

    /**
     * 获取小程序配置
     * @returns 小程序配置
     */
    @Get()
    @Permissions({
        code: "get-config",
        name: "获取小程序配置",
        description: "获取小程序配置",
    })
    getConfig() {
        return this.wxmpconfigService.getConfig();
    }

    /**
     * 更新小程序配置
     * @param data 小程序配置
     * @returns 更新后的小程序配置
     */
    @Patch()
    @Permissions({
        code: "update-config",
        name: "更新小程序配置",
        description: "更新小程序配置",
    })
    @BuildFileUrl(["**.qrCode"])
    updateConfig(@Body() data: UpdateWxMpConfigDto) {
        return this.wxmpconfigService.updateConfig(data);
    }
}
