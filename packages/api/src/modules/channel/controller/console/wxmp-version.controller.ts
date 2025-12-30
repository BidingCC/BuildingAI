import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Permissions } from "@common/decorators";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Body, Get, Param, Post, Query } from "@nestjs/common";

import { PreviewMpVersionDto } from "../../dto/preview-mp-version.dto";
import { UploadMpVersionDto } from "../../dto/upload-mp-version.dto";
import { WxMpVersionService } from "../../services/wxmp-version.service";

/**
 * 小程序版本管理控制器
 */
@ConsoleController("wxmp-version", "小程序版本管理")
export class WxMpVersionConsoleController extends BaseController {
    constructor(private readonly wxMpVersionService: WxMpVersionService) {
        super();
    }

    /**
     * 上传小程序版本
     *
     * @param dto 上传版本 DTO
     * @param user 当前登录用户
     * @returns 上传结果
     */
    @Post("upload")
    @Permissions({
        code: "upload-version",
        name: "上传小程序版本",
        description: "上传小程序版本到微信平台",
    })
    async uploadVersion(@Body() dto: UploadMpVersionDto, @Playground() user: UserPlayground) {
        return this.wxMpVersionService.uploadVersion(dto, user.id, user.username);
    }

    /**
     * 预览小程序版本
     *
     * @param dto 预览版本 DTO
     * @param user 当前登录用户
     * @returns 预览结果（包含二维码URL）
     */
    @Post("preview")
    @Permissions({
        code: "preview-version",
        name: "预览小程序版本",
        description: "生成小程序预览二维码",
    })
    @BuildFileUrl(["**.qrcodeUrl"])
    async previewVersion(@Body() dto: PreviewMpVersionDto, @Playground() user: UserPlayground) {
        return this.wxMpVersionService.previewVersion(dto, user.id, user.username);
    }

    /**
     * 获取历史上传版本列表
     *
     * @param page 页码
     * @param pageSize 每页数量
     * @param type 版本类型（可选）
     * @returns 版本列表
     */
    @Get("history")
    @Permissions({
        code: "get-version-history",
        name: "获取版本历史",
        description: "获取小程序版本上传历史",
    })
    @BuildFileUrl(["**.qrcodeUrl"])
    async getVersionHistory(
        @Query("page") page: number = 1,
        @Query("pageSize") pageSize: number = 10,
        @Query("type") type?: string,
    ) {
        return this.wxMpVersionService.getVersionHistory(page, pageSize, type as any);
    }

    /**
     * 获取最近上传版本的 SourceMap
     *
     * @returns SourceMap 文件信息
     */
    @Get("sourcemap")
    @Permissions({
        code: "get-sourcemap",
        name: "获取 SourceMap",
        description: "获取最近上传版本的 SourceMap",
    })
    async getLatestSourceMap() {
        return this.wxMpVersionService.getLatestSourceMap();
    }

    /**
     * 获取版本详情
     *
     * @param id 版本ID
     * @returns 版本详情
     */
    @Get(":id")
    @Permissions({
        code: "get-version-detail",
        name: "获取版本详情",
        description: "获取小程序版本详情",
    })
    @BuildFileUrl(["**.qrcodeUrl"])
    async getVersionDetail(@Param("id", UUIDValidationPipe) id: string) {
        return this.wxMpVersionService.findOneById(id);
    }
}
