import { BaseController } from "@buildingai/base";
import { type BooleanNumberType } from "@buildingai/constants";
import { SecretTemplateService } from "@buildingai/core/modules";
import {
    CreateSecretTemplateDto,
    ImportSecretTemplateJsonDto,
    QuerySecretTemplateDto,
    UpdateSecretTemplateDto,
} from "@buildingai/core/modules";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

/**
 * 密钥模板管理控制器（后台）
 */
@ConsoleController("secret-templates", "密钥模板管理")
export class SecretTemplateWebController extends BaseController {
    constructor(private readonly SecretTemplateService: SecretTemplateService) {
        super();
    }

    /**
     * 创建密钥模板
     */
    @Post()
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "create",
        name: "创建密钥模板",
    })
    async create(@Body() dto: CreateSecretTemplateDto) {
        return await this.SecretTemplateService.createTemplate(dto);
    }

    /**
     * 通过导入JSON创建密钥模板
     */
    @Post("import/json")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "import-json",
        name: "导入密钥模板",
    })
    async importFromJson(@Body() dto: ImportSecretTemplateJsonDto) {
        return await this.SecretTemplateService.importFromJson(dto);
    }

    /**
     * 获取密钥模板列表（分页）
     */
    @Get()
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "list",
        name: "查看密钥模板",
    })
    async list(@Query() query: QuerySecretTemplateDto) {
        return await this.SecretTemplateService.list(query);
    }

    /**
     * 获取所有启用的模板（不分页）
     */
    @Get("enabled/all")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "enabled-all",
        name: "查看密钥模板",
    })
    async getEnabledTemplates() {
        return await this.SecretTemplateService.getEnabledTemplates();
    }

    /**
     * 获取全部模板（不分页，包括启用和禁用的）
     */
    @Get("all")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "all",
        name: "查看密钥模板",
    })
    async getAllTemplates() {
        return await this.SecretTemplateService.getAllTemplates();
    }

    /**
     * 获取单个密钥模板详情
     */
    @Get(":id")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "detail",
        name: "查看密钥模板",
    })
    async findOne(@Param("id") id: string) {
        return await this.SecretTemplateService.findOneById(id);
    }

    /**
     * 更新密钥模板
     */
    @Patch(":id")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "update",
        name: "更新密钥模板",
    })
    async update(@Param("id") id: string, @Body() dto: UpdateSecretTemplateDto) {
        return await this.SecretTemplateService.updateTemplateById(id, dto);
    }

    /**
     * 设置模板启用状态
     */
    @Patch(":id/enabled")
    @Permissions({
        code: "toggle-enabled",
        name: "启用/禁用密钥模板",
    })
    async setEnabled(@Param("id") id: string, @Body("isEnabled") isEnabled: BooleanNumberType) {
        return await this.SecretTemplateService.setEnabled(id, isEnabled);
    }

    /**
     * 删除密钥模板
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除密钥模板",
    })
    async remove(@Param("id") id: string) {
        await this.SecretTemplateService.delete(id);
        return { message: "密钥模板删除成功" };
    }

    /**
     * 批量删除密钥模板
     */
    @Delete()
    @Permissions({
        code: "batch-delete",
        name: "批量删除密钥模板",
    })
    async removeMany(@Body("ids") ids: string[]) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw HttpErrorFactory.paramError("参数 ids 必须是非空数组");
        }

        const deleted = await this.SecretTemplateService.batchDelete(ids);
        return {
            message: `成功删除 ${deleted} 个密钥模板`,
            deleted,
        };
    }
}
