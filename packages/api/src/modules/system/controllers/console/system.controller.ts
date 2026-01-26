import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { ConsoleController } from "@common/decorators";
import { initializeDto } from "@modules/system/dto/system.dto";
import { Body, Get, Ip, Logger, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "src/common/decorators/permissions.decorator";

import { SystemService } from "../../services/system.service";

/**
 * 系统控制器
 *
 * 提供系统级操作的接口，如重启应用
 */
@ConsoleController("system", "系统")
export class SystemConsoleController {
    private readonly logger = new Logger(SystemConsoleController.name);

    constructor(private readonly systemService: SystemService) {}

    @Public()
    @Get("initialize")
    @BuildFileUrl(["user.avatar"])
    async getSystemInfo() {
        return this.systemService.getSystemInfo();
    }

    /**
     * 系统运行信息（版本号 & 系统ID）
     * 用于控制台“系统信息”弹窗展示
     */
    @Get("runtime")
    async getRuntimeInfo() {
        return this.systemService.getRuntimeInfo();
    }

    @Public()
    @Post("initialize")
    @BuildFileUrl(["user.avatar"])
    async setSystemInfo(
        @Body() dto: initializeDto,
        @Ip() ipAddress: string,
        @Req() request: Request,
    ) {
        const userAgent = request.get("user-agent");
        return this.systemService.initialize(dto, ipAddress, userAgent);
    }

    /**
     * 重启应用
     *
     * 通过PM2自动重启机制实现可靠的应用重启
     */
    @Post("restart")
    @Permissions({
        code: "restart",
        name: "重启应用",
    })
    async restartApplication() {
        return this.systemService.restartApplication();
    }
}
