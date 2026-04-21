import { BaseController } from "@buildingai/base";
import { SuperAdminOnly } from "@buildingai/decorators";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Post, Query } from "@nestjs/common";

import {
    Pm2DeleteDto,
    Pm2LogRotateConfigDto,
    Pm2LogsQueryDto,
    Pm2ProcessInfoQueryDto,
    Pm2ReloadDto,
    Pm2RestartDto,
    Pm2StopDto,
} from "../../dto/pm2-operation.dto";
import { Pm2Service } from "../../services/pm2.service";

/**
 * PM2 管理控制器
 * 提供 PM2 进程管理的 API 接口
 */
@ConsoleController("pm2", "PM2 管理")
export class Pm2Controller extends BaseController {
    constructor(private readonly pm2Service: Pm2Service) {
        super();
    }

    /**
     * 重启 PM2 进程
     */
    @Post("restart")
    @Permissions({
        code: "restart",
        name: "重启 PM2 进程",
        hidden: true,
    })
    async restart(@Body() dto: Pm2RestartDto) {
        const result = await this.pm2Service.restart(dto.appName);

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to restart PM2 process");
        }

        return true;
    }

    /**
     * 重载 PM2 进程（零停机）
     */
    @Post("reload")
    @Permissions({
        code: "reload",
        name: "重载 PM2 进程",
        hidden: true,
    })
    async reload(@Body() dto: Pm2ReloadDto) {
        const result = await this.pm2Service.reload(dto.appName);

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to reload PM2 process");
        }

        return true;
    }

    /**
     * 停止 PM2 进程
     */
    @Post("stop")
    @Permissions({
        code: "stop",
        name: "停止 PM2 进程",
        hidden: true,
    })
    async stop(@Body() dto: Pm2StopDto) {
        const result = await this.pm2Service.stop(dto.appName);

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to stop PM2 process");
        }

        return true;
    }

    /**
     * 删除 PM2 进程
     */
    @Delete()
    @SuperAdminOnly()
    @Permissions({
        code: "delete",
        name: "删除 PM2 进程",
        hidden: true,
    })
    async delete(@Body() dto: Pm2DeleteDto) {
        const result = await this.pm2Service.delete(dto.appName);

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to delete PM2 process");
        }

        return true;
    }

    /**
     * 获取 PM2 进程列表
     */
    @Get("list")
    @Permissions({
        code: "list",
        name: "查看 PM2 进程列表",
        hidden: true,
    })
    async getProcessList() {
        const result = await this.pm2Service.list();

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to get PM2 process list");
        }

        return result.data;
    }

    /**
     * 获取 PM2 进程信息
     */
    @Get("info")
    @Permissions({
        code: "info",
        name: "查看 PM2 进程信息",
        hidden: true,
    })
    async getProcessInfo(@Query() query: Pm2ProcessInfoQueryDto) {
        const result = await this.pm2Service.getProcessInfo(query.appName);

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to get PM2 process info");
        }

        return result.data;
    }

    /**
     * 检查 PM2 进程状态
     */
    @Get("status")
    @Permissions({
        code: "status",
        name: "查看 PM2 进程状态",
        hidden: true,
    })
    async getProcessStatus(@Query() query: Pm2ProcessInfoQueryDto) {
        const isRunning = await this.pm2Service.isProcessRunning(query.appName);

        return {
            running: isRunning,
            status: isRunning ? "online" : "offline",
        };
    }

    /**
     * 获取 PM2 日志
     */
    @Get("logs")
    @Permissions({
        code: "logs",
        name: "查看 PM2 日志",
        hidden: true,
    })
    async getLogs(@Query() query: Pm2LogsQueryDto) {
        const result = await this.pm2Service.getLogs(query.appName);

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to get PM2 logs");
        }

        return result.data;
    }

    /**
     * 清空 PM2 日志
     */
    @Post("logs/flush")
    @Permissions({
        code: "flush-logs",
        name: "清空 PM2 日志",
        hidden: true,
    })
    async flushLogs() {
        const result = await this.pm2Service.flushLogs();

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to flush PM2 logs");
        }

        return true;
    }

    /**
     * 获取 PM2 日志切割配置
     */
    @Get("log-rotate/config")
    @Permissions({
        code: "get-log-rotate-config",
        name: "获取 PM2 日志切割配置",
    })
    async getLogRotateConfig() {
        const result = await this.pm2Service.getLogRotateConfig();

        if (!result.success) {
            throw HttpErrorFactory.internal(
                result.message || "Failed to get PM2 log rotate config",
            );
        }

        return result.data;
    }

    /**
     * 保存并应用 PM2 日志切割配置
     */
    @Post("log-rotate/config")
    @Permissions({
        code: "set-log-rotate-config",
        name: "设置 PM2 日志切割配置",
    })
    async setLogRotateConfig(@Body() dto: Pm2LogRotateConfigDto) {
        const result = await this.pm2Service.setLogRotateConfig(dto);

        if (!result.success) {
            throw HttpErrorFactory.internal(
                result.message || "Failed to set PM2 log rotate config",
            );
        }

        return result.data;
    }

    /**
     * 重新应用当前 PM2 日志切割配置
     */
    @Post("log-rotate/apply")
    @Permissions({
        code: "apply-log-rotate-config",
        name: "应用 PM2 日志切割配置",
    })
    async applyLogRotateConfig() {
        const result = await this.pm2Service.applyStoredLogRotateConfig();

        if (!result.success) {
            throw HttpErrorFactory.internal(
                result.message || "Failed to apply PM2 log rotate config",
            );
        }

        return result.data;
    }

    /**
     * 获取 PM2 日志切割模块状态
     */
    @Get("log-rotate/status")
    @Permissions({
        code: "log-rotate-status",
        name: "查看 PM2 日志切割状态",
    })
    async getLogRotateStatus() {
        const result = await this.pm2Service.getLogRotateStatus();

        if (!result.success) {
            throw HttpErrorFactory.internal(
                result.message || "Failed to get PM2 log rotate status",
            );
        }

        return result.data;
    }

    /**
     * 保存 PM2 进程列表
     */
    @Post("save")
    @Permissions({
        code: "save",
        name: "保存 PM2 进程列表",
        hidden: true,
    })
    async saveProcessList() {
        const result = await this.pm2Service.save();

        if (!result.success) {
            throw HttpErrorFactory.internal(result.message || "Failed to save PM2 process list");
        }

        return true;
    }

    /**
     * 获取 PM2 健康状态
     */
    @Get("health")
    @Permissions({
        code: "health",
        name: "查看 PM2 健康状态",
        hidden: true,
    })
    async getHealthStatus() {
        const result = await this.pm2Service.getHealthStatus();
        return result.data;
    }
}
