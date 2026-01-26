import { BaseController } from "@buildingai/base";
import { type BooleanNumberType } from "@buildingai/constants";
import { SecretService } from "@buildingai/core/modules";
import { CreateSecretDto, QuerySecretDto, UpdateSecretDto } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

/**
 * 密钥配置管理控制器（后台）
 */
@ConsoleController("secret", "密钥配置管理")
export class SecretWebController extends BaseController {
    constructor(private readonly SecretService: SecretService) {
        super();
    }

    /**
     * 创建密钥配置
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建密钥配置",
    })
    async create(@Body() dto: CreateSecretDto) {
        return await this.SecretService.create(dto);
    }

    /**
     * 获取密钥配置列表（分页）
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查看密钥配置",
    })
    async list(@Query() query: QuerySecretDto) {
        return await this.SecretService.list(query);
    }

    /**
     * 根据模板ID获取配置列表
     */
    @Get("by-template/:templateId")
    @Permissions({
        code: "list-by-template",
        name: "查看密钥配置",
    })
    async getConfigsByTemplate(
        @Param("templateId") templateId: string,
        @Query("onlyActive") onlyActive?: string,
    ) {
        const onlyActiveBoolean = onlyActive === "true";
        return await this.SecretService.getConfigsByTemplate(templateId, onlyActiveBoolean);
    }

    /**
     * 获取配置统计信息
     */
    @Get("stats")
    @Permissions({
        code: "stats",
        name: "查看密钥配置",
    })
    async getStats(@Query("templateId") templateId?: string) {
        return await this.SecretService.getConfigStats(templateId);
    }

    /**
     * 获取单个密钥配置详情（不包含敏感信息）
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看密钥配置",
    })
    async findOne(@Param("id") id: string) {
        return await this.SecretService.getConfigDetail(id);
    }

    /**
     * 获取单个密钥配置详情（包含敏感信息）
     */
    @Get(":id/full")
    @Permissions({
        code: "detail-full",
        name: "管理密钥配置",
    })
    async findOneFull(@Param("id") id: string) {
        return await this.SecretService.getConfigDetail(id);
    }

    /**
     * 更新密钥配置
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "更新密钥配置",
    })
    async update(@Param("id") id: string, @Body() dto: UpdateSecretDto) {
        return await this.SecretService.updateById(id, dto);
    }

    /**
     * 设置配置状态
     */
    @Patch(":id/status")
    @Permissions({
        code: "update-status",
        name: "更新密钥配置状态",
    })
    async setStatus(@Param("id") id: string, @Body("status") status: BooleanNumberType) {
        return await this.SecretService.setStatus(id, status);
    }

    /**
     * 删除密钥配置
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除密钥配置",
    })
    async remove(@Param("id") id: string) {
        await this.SecretService.delete(id);
        return { message: "密钥配置删除成功" };
    }

    /**
     * 批量删除密钥配置
     */
    @Delete()
    @Permissions({
        code: "batch-delete",
        name: "批量删除密钥配置",
    })
    async removeMany(@Body("ids") ids: string[]) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw HttpErrorFactory.paramError("参数 ids 必须是非空数组");
        }

        const deleted = await this.SecretService.deleteMany(ids);
        return {
            message: `成功删除 ${deleted} 个密钥配置`,
            deleted,
        };
    }
}
