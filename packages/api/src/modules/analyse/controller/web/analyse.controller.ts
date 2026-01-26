import { BaseController } from "@buildingai/base";
import { AnalyseActionType } from "@buildingai/db/entities";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { RecordAnalyseDto } from "../../dto";
import { AnalyseService } from "../../services/analyse.service";

/**
 * 行为分析控制器（前台）
 *
 * 提供记录用户行为（访问、插件使用等）的 API 接口
 */
@WebController({ path: "analyse", skipAuth: true })
export class AnalyseWebController extends BaseController {
    /**
     * 构造函数
     *
     * @param analyseService 行为分析服务
     */
    constructor(private readonly analyseService: AnalyseService) {
        super();
    }

    /**
     * 记录行为分析
     *
     * 统一的接口，支持记录所有类型的行为
     * - PAGE_VISIT: 30分钟内同一用户/IP只记录一次
     * - PLUGIN_USE: 直接记录
     * - API_CALL: 直接记录
     * - OTHER: 直接记录
     *
     * @param recordAnalyseDto 记录行为分析DTO
     * @param request 请求对象（用于获取IP、User-Agent和用户信息）
     * @returns 记录结果
     */
    @Post("")
    @Public()
    async recordAnalyse(@Body() recordAnalyseDto: RecordAnalyseDto, @Req() request: Request) {
        // 从请求对象中获取用户信息（如果已认证，AuthGuard 会设置 request.user）
        const user = request.user;
        const userId = user?.id || null;
        // 从请求对象中获取IP和User-Agent
        const ipAddress = this.getClientIP(request);
        const userAgent = request.get("user-agent") || null;

        // 定义返回类型
        type RecordResult = { recorded: boolean };

        let result: RecordResult;

        switch (recordAnalyseDto.actionType) {
            case AnalyseActionType.PAGE_VISIT: {
                const recorded = await this.analyseService.recordPageVisit(
                    userId,
                    recordAnalyseDto.source,
                    ipAddress,
                    userAgent,
                    recordAnalyseDto.extraData || null,
                );
                result = {
                    recorded,
                };
                break;
            }

            case AnalyseActionType.PLUGIN_USE: {
                const pluginName =
                    recordAnalyseDto.extraData?.plugin ||
                    recordAnalyseDto.extraData?.extensionName ||
                    recordAnalyseDto.source;
                await this.analyseService.recordPluginUse(
                    userId,
                    pluginName,
                    ipAddress,
                    userAgent,
                    recordAnalyseDto.extraData || null,
                );
                break;
            }

            default: {
                await this.analyseService.recordAction(
                    recordAnalyseDto.actionType,
                    userId,
                    recordAnalyseDto.source,
                    ipAddress,
                    userAgent,
                    recordAnalyseDto.extraData || null,
                );
                break;
            }
        }

        return result;
    }

    private getClientIP(request: Request): string {
        // Check x-forwarded-for header (real IP behind proxy)
        const xForwardedFor = request.headers["x-forwarded-for"] as string;
        if (xForwardedFor) {
            const ips = xForwardedFor.split(",").map((ip) => ip.trim());
            const clientIP = ips[0];
            if (clientIP) {
                return clientIP.startsWith("::ffff:") ? clientIP.substring(7) : clientIP;
            }
        }

        // Use connection address
        const remoteAddress = request.socket?.remoteAddress || request.ip;
        return remoteAddress?.startsWith("::ffff:")
            ? remoteAddress.substring(7)
            : remoteAddress || "unknown";
    }
}
