import { getProvider } from "@buildingai/ai-sdk";
import { BaseController } from "@buildingai/base";
import { SecretService } from "@buildingai/core/modules";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import {
    CreateAiProviderDto,
    QueryAiProviderDto,
    UpdateAiProviderDto,
} from "@modules/ai/provider/dto/ai-provider.dto";
import { AiProviderService } from "@modules/ai/provider/services/ai-provider.service";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

/**
 * AI供应商管理控制器（后台）
 *
 * 提供AI供应商的完整管理功能，包括CRUD操作和连接测试
 */
@ConsoleController("ai-providers", "AI供应商管理")
export class AiProviderConsoleController extends BaseController {
    constructor(
        private readonly aiProviderService: AiProviderService,
        private readonly secretService: SecretService,
    ) {
        super();
    }

    /**
     * 创建AI供应商
     */
    @Post()
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "create",
        name: "创建AI供应商",
    })
    async create(@Body() dto: CreateAiProviderDto) {
        return await this.aiProviderService.createProvider(dto);
    }

    /**
     * 获取AI供应商列表（不分页）
     * @description 获取所有AI供应商列表，支持关键词搜索和状态过滤
     */
    @Get()
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "list",
        name: "查看AI供应商",
    })
    async findAll(@Query() query: QueryAiProviderDto) {
        const queryOptions = {
            keyword: query.keyword,
            isActive: query.isActive,
        };

        return await this.aiProviderService.getProviderList(queryOptions, ["apiKey"]);
    }

    /**
     * 获取单个AI供应商详情
     */
    @Get(":id")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "detail",
        name: "查看AI供应商",
        hidden: true,
    })
    async findOne(@Param("id") id: string) {
        return await this.aiProviderService.getProviderDetail(id, []);
    }

    /**
     * 获取单个AI供应商详情（包含敏感信息）
     */
    @Get(":id/full")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "full-detail",
        name: "管理AI供应商",
        hidden: true,
    })
    async findOneFull(@Param("id") id: string) {
        return await this.aiProviderService.getProviderDetail(id);
    }

    /**
     * 更新AI供应商配置
     */
    @Patch(":id")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "update",
        name: "更新AI供应商",
    })
    async update(@Param("id") id: string, @Body() dto: UpdateAiProviderDto) {
        // 如果要启用供应商，检查是否已填写 apiKey
        if (dto.isActive === true) {
            const provider = await this.aiProviderService.findOneById(id);
            if (!provider) {
                throw HttpErrorFactory.business("AI供应商不存在");
            }

            // 检查当前 apiKey 和更新的 apiKey
            const finalbindSecretId =
                dto.bindSecretId !== undefined ? dto.bindSecretId : provider.bindSecretId;
            if (!finalbindSecretId || finalbindSecretId.trim() === "") {
                throw HttpErrorFactory.business("请先完善密钥配置后再启用供应商");
            }
        }

        return await this.aiProviderService.updateProvider(id, dto);
    }

    /**
     * 删除AI供应商
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除AI供应商",
    })
    async remove(@Param("id") id: string) {
        const provider = await this.aiProviderService.findOneById(id);
        if (!provider) {
            throw HttpErrorFactory.business("AI供应商不存在");
        }

        await this.aiProviderService.deleteProvider(id);
        return { message: "AI供应商删除成功" };
    }

    /**
     * 批量删除AI供应商
     */
    @Delete()
    @Permissions({
        code: "batch-delete",
        name: "删除AI供应商",
        hidden: true,
    })
    async removeMany(@Body("ids") ids: string[]) {
        const providers = await Promise.all(
            ids.map((id) => this.aiProviderService.findOneById(id)),
        );

        // 过滤掉不存在的供应商 ID
        const validIds = providers
            .map((provider, index) => (provider ? ids[index] : null))
            .filter((id) => id !== null);

        if (validIds.length === 0) {
            throw HttpErrorFactory.business("没有找到可删除的AI供应商");
        }

        const deletePromises = validIds.map((id) => this.aiProviderService.deleteProvider(id));
        await Promise.all(deletePromises);
        return {
            message: `成功删除 ${validIds.length} 个AI供应商`,
            deleted: validIds.length,
        };
    }

    /**
     * 获取所有启用的供应商
     */
    @Get("active/all")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "active-all",
        name: "查看AI供应商",
        hidden: true,
    })
    async getActiveProviders() {
        return await this.aiProviderService.getActiveProviders(["apiKey"]);
    }

    /**
     * 根据供应商标识获取供应商
     */
    @Get("by-code/:provider")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "by-code",
        name: "根据供应商标识查看AI供应商",
        hidden: true,
    })
    async getProviderByCode(@Param("provider") provider: string) {
        const result = await this.aiProviderService.getProviderByCode(provider, ["apiKey"]);
        if (!result) {
            return { message: "供应商不存在" };
        }
        return result;
    }

    /**
     * 启用/禁用供应商
     */
    @Patch(":id/toggle-active")
    @Permissions({
        code: "toggle-active",
        name: "更新AI供应商",
    })
    async toggleActive(@Param("id") id: string, @Body("isActive") isActive: boolean) {
        // 如果要启用供应商，检查是否已填写 apiKey
        if (typeof isActive !== "boolean") {
            throw HttpErrorFactory.business("参数 isActive 必须是布尔值");
        }
        const provider = await this.aiProviderService.findOneById(id);
        if (!provider) {
            throw HttpErrorFactory.business("AI供应商不存在");
        }

        if (!provider.bindSecretId || provider.bindSecretId.trim() === "") {
            throw HttpErrorFactory.business("请先完善密钥配置后再启用供应商");
        }

        return await this.aiProviderService.updateProvider(
            id,
            { isActive },
            {
                excludeFields: ["apiKey"],
            },
        );
    }

    /**
     * 获取供应商远程模型列表
     * @description 通过供应商的 /v1/models 接口获取可用模型列表
     */
    @Get("remote/:providerId")
    @Permissions({
        code: "remote-models",
        name: "查看远程模型列表",
    })
    async getRemoteModels(@Param("providerId") providerId: string) {
        const providerEntity = await this.aiProviderService.findOneById(providerId);
        if (!providerEntity) {
            throw HttpErrorFactory.business("AI供应商不存在");
        }

        if (!providerEntity.bindSecretId) {
            return [];
        }

        try {
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                providerEntity.bindSecretId,
            );

            const provider = getProvider(providerEntity.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
            });

            return await provider.listModels();
        } catch (error) {
            console.error(error);
            return [];
        }
    }
}
