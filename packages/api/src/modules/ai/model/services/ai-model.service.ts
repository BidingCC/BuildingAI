import { BaseService, FieldFilterOptions } from "@buildingai/base";
import { AI_DEFAULT_MODEL } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiModel } from "@buildingai/db/entities";
import { FindOptionsWhere, In, Like, Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import {
    BatchSortAiModelDto,
    CreateAiModelDto,
    QueryAiModelDto,
    UpdateAiModelDto,
} from "@modules/ai/model/dto/ai-model.dto";
import { Injectable } from "@nestjs/common";

/**
 * AI模型管理服务
 *
 * 提供AI模型的完整CRUD操作和业务逻辑
 */
@Injectable()
export class AiModelService extends BaseService<AiModel> {
    constructor(
        @InjectRepository(AiModel)
        private readonly aiModelRepository: Repository<AiModel>,
        private readonly dictService: DictService,
    ) {
        super(aiModelRepository);
    }

    /**
     * 创建AI模型配置
     *
     * @param dto 创建AI模型DTO
     * @param options 字段过滤选项
     * @returns 创建的AI模型实体
     */
    async createModel(
        dto: CreateAiModelDto,
        options?: FieldFilterOptions<AiModel>,
    ): Promise<Partial<AiModel>> {
        // 设置默认值
        const modelData = {
            ...dto,
        };

        try {
            const result = await this.create(modelData, options);
            if (dto.isDefault) {
                await this.dictService.set(AI_DEFAULT_MODEL, result.id);
            }
            return result;
        } catch (error) {
            this.logger.error(`创建AI模型失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create AI model.");
        }
    }

    /**
     * 更新AI模型配置
     *
     * @param id 模型ID
     * @param dto 更新AI模型DTO
     * @param options 字段过滤选项
     * @returns 更新后的AI模型实体
     */
    async updateModel(
        id: string,
        dto: UpdateAiModelDto,
        options?: FieldFilterOptions<AiModel>,
    ): Promise<Partial<AiModel>> {
        // 如果设置为默认模型，先取消其他默认模型
        if (dto.isDefault) {
            await this.dictService.set(AI_DEFAULT_MODEL, id);
        } else {
            await this.dictService.deleteByKey(AI_DEFAULT_MODEL);
        }

        try {
            return await this.updateById(id, dto, options);
        } catch (error) {
            this.logger.error(`更新AI模型失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update AI model.");
        }
    }

    /**
     * 批量更新AI模型状态
     *
     * @param ids 模型ID列表
     * @param dto 更新AI模型DTO
     * @param options 字段过滤选项
     * @returns 更新后的AI模型实体
     */
    async updateModelMany(
        ids: string[],
        dto: UpdateAiModelDto,
        options?: FieldFilterOptions<AiModel>,
    ): Promise<Partial<AiModel>[]> {
        try {
            // 使用 In 操作符构建 where 条件
            const where = { id: In(ids) };
            const updateOptions = { ...options, where };

            // 使用 update 方法进行批量更新
            const result = await this.update(dto, updateOptions);

            // 确保返回的是数组
            return Array.isArray(result) ? result : [result];
        } catch (error) {
            this.logger.error(`更新AI模型失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update AI model.");
        }
    }

    /**
     * 获取可用的模型列表
     *
     * @param excludeFields 要排除的字段
     * @returns 可用的AI模型列表
     */
    async getAvailableModels(excludeFields: string[] = ["apiKey"]) {
        try {
            const models = await this.findAll({
                where: { isActive: true },
                order: {
                    sortOrder: "DESC",
                    createdAt: "DESC",
                },
                excludeFields,
            });

            return models;
        } catch (error) {
            this.logger.error(`获取可用模型列表失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal("Failed to get available models.");
        }
    }

    /**
     * 获取AI模型列表（不分页）
     * @description 获取所有AI模型列表，支持搜索和过滤
     * @param queryDto 查询条件
     * @param excludeFields 要排除的字段
     * @returns 模型列表
     */
    async getModelList(queryDto: QueryAiModelDto = {}, excludeFields: string[] = ["apiKey"]) {
        const where = buildWhere<AiModel>({
            providerId: queryDto.providerId,
            isActive: queryDto.isActive,
        });

        if (queryDto.modelType && queryDto.modelType.length > 0) {
            where.modelType = In(queryDto.modelType);
        }

        // 关键词搜索（名称或描述）
        const whereConditions: FindOptionsWhere<AiModel>[] = [];
        if (queryDto.keyword) {
            whereConditions.push(
                { ...where, ...{ name: Like(`%${queryDto.keyword}%`) } },
                { ...where, ...{ description: Like(`%${queryDto.keyword}%`) } },
            );
        } else {
            whereConditions.push(where);
        }

        try {
            const models = await this.findAll({
                where: whereConditions.length > 1 ? whereConditions : where,
                order: {
                    sortOrder: "DESC",
                    createdAt: "DESC",
                },
                excludeFields,
            });

            const defaultModelId = await this.dictService.get(AI_DEFAULT_MODEL);

            // 为每个模型添加isDefault属性
            const modelsWithDefault = models.map((item) => ({
                ...item,
                isDefault: item.id === defaultModelId,
            }));

            return modelsWithDefault;
        } catch (error) {
            this.logger.error(`查询AI模型列表失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal("查询AI模型列表失败");
        }
    }

    /**
     * 批量排序AI模型
     * @description 根据提供的ID数组顺序更新模型的sortOrder字段
     * @param dto 批量排序DTO，包含排序后的模型ID数组
     * @returns 更新结果
     */
    async batchSortModels(dto: BatchSortAiModelDto): Promise<void> {
        const { sort } = dto;

        if (!sort || sort.length === 0) {
            throw HttpErrorFactory.paramError("排序数组不能为空");
        }

        try {
            // 验证所有模型ID是否存在
            const models = await this.findAll({
                where: { id: In(sort) },
            });

            if (models.length !== sort.length) {
                throw HttpErrorFactory.business("部分模型ID不存在");
            }

            // 根据数组顺序计算 sortOrder（后端按 DESC 排序，所以第一个元素需要最大的 sortOrder）
            // 第一个元素 sortOrder = length - 1，最后一个元素 sortOrder = 0
            const updatePromises = sort.map((id, index) => {
                const sortOrderValue = sort.length - 1 - index;
                return this.updateById(id, { sortOrder: sortOrderValue } as UpdateAiModelDto);
            });

            await Promise.all(updatePromises);
        } catch (error) {
            this.logger.error(`批量排序AI模型失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("批量排序AI模型失败");
        }
    }
}
