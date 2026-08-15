import { BaseController } from "@buildingai/base";
import { Permissions } from "@common/decorators";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { UpdateGoogleConfigDto } from "@modules/channel/dto/google-config.dto";
import { GoogleConfigService } from "@modules/channel/services/google-config.service";
import { Body, Get, Patch } from "@nestjs/common";

@ConsoleController("google-config", "Google登录配置")
export class GoogleConfigConsoleController extends BaseController {
    constructor(private readonly googleConfigService: GoogleConfigService) {
        super();
    }
    /**
     * 获取Google登录配置
     * @returns Google登录配置
     */
    @Get()
    @Permissions({
        code: "google-config:get-config",
        name: "获取Google登录配置",
    })
    getConfig() {
        return this.googleConfigService.getConfig();
    }
    /**
     * 更新Google登录配置
     * @param updateGoogleConfigDto 更新配置DTO
     * @returns 更新后的配置
     */
    @Patch()
    @Permissions({
        code: "google-config:update-config",
        name: "更新Google登录配置",
    })
    update(@Body() updateGoogleConfigDto: UpdateGoogleConfigDto) {
        return this.googleConfigService.updateConfig(updateGoogleConfigDto);
    }
}
