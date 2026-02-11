import { BaseController } from "@buildingai/base";
import { Permissions } from "@common/decorators";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Body, Get, Patch } from "@nestjs/common";

import { type GoogleOaConfigResponse, SetGoogleOaConfigDto } from "../../dto/google-oa.dto";
import { GoogleOaConfigService } from "../../services/google-oa.service";

@ConsoleController("google-oa", "谷歌登录配置")
export class GoogleOaConsoleController extends BaseController {
    constructor(private readonly googleOaConfigService: GoogleOaConfigService) {
        super();
    }

    @Get()
    @Permissions({
        code: "get-config",
        name: "获取谷歌登录配置",
    })
    getConfig(): Promise<GoogleOaConfigResponse> {
        return this.googleOaConfigService.getConfig();
    }

    @Patch()
    @Permissions({
        code: "update-config",
        name: "更新谷歌登录配置",
    })
    setConfig(@Body() dto: SetGoogleOaConfigDto) {
        return this.googleOaConfigService.setConfig(dto);
    }
}
