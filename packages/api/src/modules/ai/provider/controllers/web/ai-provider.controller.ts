import { BaseController } from "@buildingai/base";
import { AiProvider } from "@buildingai/db/entities";
import { Like } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { buildWhere } from "@buildingai/utils";
import { WebController } from "@common/decorators/controller.decorator";
import { QueryAiProviderDto } from "@modules/ai/provider/dto/web/ai-provider.dto";
import { AiProviderService } from "@modules/ai/provider/services/ai-provider.service";
import { Get, Param, Query } from "@nestjs/common";

/**
 * AI供应商控制器（前台）
 *
 * 提供AI供应商信息和模型列表查询功能
 */
@WebController("ai-providers")
export class AiProviderWebController extends BaseController {
    constructor(private readonly aiProviderService: AiProviderService) {
        super();
    }

    /**
     * 获取所有启用的供应商列表
     */
    @Get()
    @Public()
    @BuildFileUrl(["**.iconUrl"])
    async getProviders(@Query() queryDto: QueryAiProviderDto) {
        try {
            const where = [
                buildWhere<AiProvider>({
                    name: queryDto.name ? Like(`%${queryDto.name}%`) : undefined,
                    isActive: true,
                }),
                buildWhere<AiProvider>({
                    provider: queryDto.name ? Like(`%${queryDto.name}%`) : undefined,
                    isActive: true,
                }),
            ];

            // 获取启用的供应商，包含模型关联数据
            const providers = await this.aiProviderService.findAll({
                where,
                relations: ["models"],
                order: { sortOrder: "DESC", createdAt: "DESC" },
                excludeFields: ["apiKey"],
            });

            providers.forEach((p) =>
                p.models?.sort(
                    (a, b) =>
                        b.sortOrder - a.sortOrder || b.createdAt.getTime() - a.createdAt.getTime(),
                ),
            );

            // 先过滤掉没有模型的供应商
            const validProviders = providers.filter(
                (provider) => provider.models && provider.models.length > 0,
            );

            // 如果没有有效供应商，直接返回空数组
            if (validProviders.length === 0) {
                return [];
            }

            if (queryDto.supportedModelTypes && queryDto.supportedModelTypes.length > 0) {
                return validProviders
                    .map((provider) => {
                        const filteredModels = provider.models.filter(
                            (model) =>
                                queryDto.supportedModelTypes.includes(model.modelType) &&
                                model.isActive,
                        );

                        provider.models = provider.models.map((modelItem) => {
                            let newConfig = {};
                            if (!modelItem.modelConfig) {
                                return modelItem;
                            }

                            if (modelItem.modelConfig instanceof Array) {
                                modelItem.modelConfig.forEach((config) => {
                                    newConfig[config.field as string] = config.value;
                                });
                            }
                            modelItem.modelConfig = newConfig as any;
                            return modelItem;
                        });

                        return {
                            ...provider,
                            models: filteredModels,
                        };
                    })
                    .filter((provider) => provider.models.length > 0);
            }

            return validProviders;
        } catch (error) {
            this.logger.error(`获取供应商列表失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 获取指定供应商信息
     */
    @Get(":id")
    @BuildFileUrl(["**.iconUrl"])
    async getProviderInfo(@Param("id") id: string) {
        try {
            const provider = await this.aiProviderService.findOne({
                where: { id },
                relations: ["models"],
                excludeFields: ["apiKey"],
            });

            if (!provider) {
                throw new Error(`供应商 ${id} 不存在`);
            }

            provider.models?.sort(
                (a, b) =>
                    b.sortOrder - a.sortOrder || b.createdAt.getTime() - a.createdAt.getTime(),
            );

            return provider;
        } catch (error) {
            this.logger.error(`获取供应商信息失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 根据供应商代码获取供应商
     */
    @Get("by-code/:provider")
    @BuildFileUrl(["**.iconUrl"])
    async getProviderByCode(@Param("provider") provider: string) {
        try {
            const result = await this.aiProviderService.findOne({
                where: { provider, isActive: true },
                relations: ["models"],
                excludeFields: ["apiKey"],
            });

            if (!result) {
                throw new Error(`供应商 ${provider} 不存在`);
            }

            result.models?.sort(
                (a, b) =>
                    b.sortOrder - a.sortOrder || b.createdAt.getTime() - a.createdAt.getTime(),
            );

            return result;
        } catch (error) {
            this.logger.error(`获取供应商信息失败: ${error.message}`, error.stack);
            throw error;
        }
    }
}
