import {
    getModelFeaturesWithDescriptions,
    getModelTypesWithDescriptions,
} from "@buildingai/ai-sdk";
import { BaseController } from "@buildingai/base";
import { AI_DEFAULT_MODEL } from "@buildingai/constants";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { AiModel } from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import {
    BatchSortAiModelDto,
    BatchUpdateAiModelDto,
    CreateAiModelDto,
    QueryAiModelDto,
    UpdateAiModelDto,
} from "@modules/ai/model/dto/ai-model.dto";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { AiProviderService } from "@modules/ai/provider/services/ai-provider.service";
import { Body, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";

/**
 * AI模型管理控制器（后台）
 *
 * 提供AI模型的完整管理功能
 */
@ConsoleController("ai-models", "AI模型管理")
export class AiModelConsoleController extends BaseController {
    constructor(
        private readonly aiModelService: AiModelService,
        private readonly aiProviderService: AiProviderService,
        private readonly dictService: DictService,
    ) {
        super();
    }

    /**
     * 创建AI模型配置
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建AI模型",
    })
    async create(@Body() dto: CreateAiModelDto) {
        if (dto.modelType !== undefined) {
            const provider = await this.aiProviderService.findOneById(dto.providerId);
            if (!provider) {
                throw HttpErrorFactory.business("AI供应商不存在");
            }

            if (!provider.supportedModelTypes.includes(dto.modelType)) {
                throw HttpErrorFactory.business("AI供应商不支持该模型类型");
            }
        }

        // 验证计费规则
        if (dto.billingRule) {
            if (dto.billingRule.power < 0) {
                throw HttpErrorFactory.business("计费规则中的 power 不能小于 0");
            }
            if (dto.billingRule.tokens < 0) {
                throw HttpErrorFactory.business("计费规则中的 tokens 不能小于 0");
            }
        }

        return await this.aiModelService.createModel(dto);
    }

    /**
     * 获取AI模型列表（不分页）
     * @description 获取所有AI模型列表，支持搜索和过滤
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查看AI模型",
    })
    async list(@Query() query: QueryAiModelDto) {
        return await this.aiModelService.getModelList(query, ["apiKey"]);
    }

    /**
     * 获取单个AI模型详情
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看AI模型",
    })
    async findOne(@Param("id") id: string) {
        const result = (await this.aiModelService.findOneById(id, {
            excludeFields: ["apiKey"],
        })) as AiModel & { isDefault: boolean };

        result.isDefault = result.id === (await this.dictService.get(AI_DEFAULT_MODEL));

        return result;
    }

    /**
     * 获取模型类型
     */
    @Get("type-father/list")
    @Permissions({
        code: "type-father-list",
        name: "查看AI供应商类型",
    })
    async getFatherProviderTypeList(@Query("providerId") providerId?: string) {
        if (!providerId) {
            return getModelTypesWithDescriptions();
        }
        const provider = await this.aiProviderService.findOneById(providerId);
        if (!provider) {
            throw HttpErrorFactory.business("AI供应商不存在");
        }
        const typeList = getModelTypesWithDescriptions();
        return typeList.filter((type) => provider.supportedModelTypes?.includes(type.value));
    }

    /**
     * 获取模型类型
     */
    @Get("type/list")
    @Permissions({
        code: "type-list",
        name: "查看AI供应商类型",
    })
    async getProviderTypeList() {
        return getModelTypesWithDescriptions();
    }

    /**
     * 获取AI模型特性
     */
    @Get("features/list")
    @Permissions({
        code: "features-list",
        name: "管理AI模型",
    })
    async getFeaturesList() {
        return getModelFeaturesWithDescriptions();
    }

    /**
     * 获取单个AI模型详情（包含敏感信息）
     */
    @Get(":id/full")
    @Permissions({
        code: "detail-full",
        name: "管理AI模型",
    })
    async findOneFull(@Param("id") id: string) {
        return await this.aiModelService.findOneById(id);
    }

    /**
     * 批量启用/禁用AI 模型
     */
    @Patch("batch-toggle-active")
    @Permissions({
        code: "batch-toggle-active",
        name: "更新AI模型",
    })
    async batchToggleActive(@Body("ids") ids: string[], @Body("isActive") isActive: boolean) {
        if (!Array.isArray(ids)) {
            throw HttpErrorFactory.business("参数 ids 必须是数组");
        }
        if (typeof isActive !== "boolean") {
            throw HttpErrorFactory.business("参数 isActive 必须是布尔值");
        }
        // 批量检查模型是否存在
        const models = await Promise.all(ids.map((id) => this.aiModelService.findOneById(id)));
        if (models.length === 0) {
            throw HttpErrorFactory.business("模型不存在");
        }

        return await this.aiModelService.updateModelMany(ids, { isActive });
    }

    /**
     * 更新AI模型配置
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "更新AI模型",
    })
    async update(@Param("id") id: string, @Body() dto: UpdateAiModelDto) {
        if (dto.modelType) {
            const provider = await this.aiProviderService.findOneById(dto.providerId);
            if (!provider) {
                throw HttpErrorFactory.business("AI供应商不存在");
            }

            if (!provider.supportedModelTypes.includes(dto.modelType)) {
                throw HttpErrorFactory.business("AI供应商不支持该模型类型");
            }
        }

        // 验证计费规则
        if (dto.billingRule) {
            if (dto.billingRule.power < 0) {
                throw HttpErrorFactory.business("计费规则中的 power 不能小于 0");
            }
            if (dto.billingRule.tokens < 0) {
                throw HttpErrorFactory.business("计费规则中的 tokens 不能小于 0");
            }
        }

        return await this.aiModelService.updateModel(id, dto);
    }

    /**
     * 批量更新AI模型配置
     */
    @Patch("batch/update")
    @Permissions({
        code: "update",
        name: "批量更新AI模型",
    })
    async batchUpdate(@Body() dto: BatchUpdateAiModelDto) {
        const { models, skipErrors = false } = dto;

        if (!models || !Array.isArray(models) || models.length === 0) {
            throw HttpErrorFactory.business("参数 models 必须是非空数组");
        }

        const results = [];
        const errors = [];

        // 批量处理每个模型
        for (const modelItem of models) {
            try {
                // 验证模型是否存在
                const existingModel = await this.aiModelService.findOneById(modelItem.id);
                if (!existingModel) {
                    throw HttpErrorFactory.business(`模型ID ${modelItem.id} 不存在`);
                }

                // 验证供应商和模型类型
                if (modelItem.modelType && modelItem.providerId) {
                    const provider = await this.aiProviderService.findOneById(modelItem.providerId);
                    if (!provider) {
                        throw HttpErrorFactory.business(`AI供应商 ${modelItem.providerId} 不存在`);
                    }

                    if (!provider.supportedModelTypes.includes(modelItem.modelType)) {
                        throw HttpErrorFactory.business(
                            `AI供应商 ${modelItem.providerId} 不支持模型类型 ${modelItem.modelType}`,
                        );
                    }
                }

                // 验证计费规则
                if (modelItem.billingRule) {
                    if (modelItem.billingRule.power < 0) {
                        throw HttpErrorFactory.business(
                            `模型ID ${modelItem.id} 的计费规则中 power 不能小于 0`,
                        );
                    }
                    if (modelItem.billingRule.tokens < 0) {
                        throw HttpErrorFactory.business(
                            `模型ID ${modelItem.id} 的计费规则中 tokens 不能小于 0`,
                        );
                    }
                }

                // 更新模型
                const result = await this.aiModelService.updateModel(modelItem.id, modelItem);
                results.push(result);
            } catch (error) {
                if (skipErrors) {
                    // 记录错误但继续处理其他模型
                    errors.push({
                        modelId: modelItem.id,
                        error: error.message || "更新失败",
                    });
                } else {
                    // 不跳过错误，直接抛出异常终止处理
                    throw error;
                }
            }
        }

        return {
            success: true,
            results,
            errors: errors.length > 0 ? errors : undefined,
            total: models.length,
            successCount: results.length,
            failCount: errors.length,
        };
    }

    /**
     * 启用/禁用AI模型
     */
    @Patch(":id/toggle-active")
    @Permissions({
        code: "toggle-active",
        name: "启用/禁用AI模型",
    })
    async toggleActive(@Param("id") id: string, @Body("isActive") isActive: boolean) {
        if (typeof isActive !== "boolean") {
            throw HttpErrorFactory.business("参数 isActive 必须是布尔值");
        }
        const model = await this.aiModelService.findOneById(id);
        if (!model) {
            throw HttpErrorFactory.business("模型不存在");
        }
        return await this.aiModelService.updateModel(id, { isActive });
    }

    /**
     * 删除AI模型
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除AI模型",
    })
    async remove(@Param("id") id: string) {
        // 检查是否为内置模型
        const model = await this.aiModelService.findOneById(id);
        if (!model) {
            throw HttpErrorFactory.business("AI模型不存在");
        }

        if (model.isBuiltIn) {
            throw HttpErrorFactory.business(
                "系统内置模型不允许删除",
                BusinessCode.OPERATION_NOT_ALLOWED,
            );
        }

        // 检查是否是默认模型
        const defaultModelId = await this.dictService.get(AI_DEFAULT_MODEL);
        if (defaultModelId === id) {
            await this.dictService.deleteByKey(AI_DEFAULT_MODEL);
        }

        await this.aiModelService.delete(id);
        return { message: "AI model deleted successfully" };
    }

    /**
     * 批量删除AI模型
     */
    @Delete()
    @Permissions({
        code: "batch-delete",
        name: "删除AI模型",
    })
    async removeMany(@Body("ids") ids: string[]) {
        // 批量检查是否包含内置模型
        const models = await Promise.all(ids.map((id) => this.aiModelService.findOneById(id)));

        const builtInModels = models.filter((model) => model?.isBuiltIn);
        if (builtInModels.length > 0) {
            const builtInNames = builtInModels.map((m) => m.name).join("、");
            throw HttpErrorFactory.business(
                `以下系统内置模型不允许删除：${builtInNames}`,
                BusinessCode.OPERATION_NOT_ALLOWED,
            );
        }

        // 过滤掉不存在的模型 ID
        const validIds = models
            .map((model, index) => (model ? ids[index] : null))
            .filter((id) => id !== null);

        if (validIds.length === 0) {
            throw HttpErrorFactory.business("没有找到可删除的AI模型");
        }

        // 检查是否包含默认模型
        const defaultModelId = await this.dictService.get<string>(AI_DEFAULT_MODEL);
        if (defaultModelId && validIds.includes(defaultModelId)) {
            await this.dictService.deleteByKey(AI_DEFAULT_MODEL);
        }

        const deleted = await this.aiModelService.deleteMany(validIds);
        return {
            message: `Successfully deleted ${deleted} AI models`,
            deleted,
        };
    }

    /**
     * 获取可用模型列表（不分页）
     */
    @Get("available/all")
    @Permissions({
        code: "available-all",
        name: "查看AI模型",
    })
    async getAvailableModels() {
        return await this.aiModelService.getAvailableModels(["apiKey"]);
    }

    /**
     * 获取默认模型
     */
    @Get("default/current")
    @Permissions({
        code: "default-current",
        name: "查看AI模型",
    })
    async getDefaultModel() {
        const model_id = await this.dictService.get(AI_DEFAULT_MODEL);

        if (model_id) {
            const model = await this.aiModelService.findOne({
                where: { id: model_id },
                excludeFields: ["apiKey"],
            });
            if (model && model.isActive) {
                return model;
            }
        }

        const model = await this.aiModelService.findOne({
            where: { isActive: true },
            order: { createdAt: "ASC" },
            excludeFields: ["apiKey"],
        });

        if (model && model.isActive) {
            return model;
        }

        return null;
    }

    /**
     * 设置默认模型
     */
    @Put(":id/default")
    @Permissions({
        code: "default-update",
        name: "设置默认AI模型",
    })
    async setDefault(@Param("id") id: string) {
        await this.dictService.set(AI_DEFAULT_MODEL, id);
        return { message: "Default model set successfully" };
    }

    /**
     * 批量排序AI模型
     */
    @Patch("batch/sort")
    @Permissions({
        code: "batch-sort",
        name: "批量排序AI模型",
    })
    async batchSort(@Body() dto: BatchSortAiModelDto) {
        await this.aiModelService.batchSortModels(dto);
        return { message: "模型排序更新成功" };
    }
}
