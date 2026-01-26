import { BaseService } from "@buildingai/base";
import { BooleanNumber, type BooleanNumberType } from "@buildingai/constants";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { SecretTemplate } from "@buildingai/db/entities";
import { Like, Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";

import {
    CreateSecretTemplateDto,
    ImportSecretTemplateJsonDto,
    QuerySecretTemplateDto,
    UpdateSecretTemplateDto,
} from "../dto/secret-template.dto";

/**
 * Secret template service
 */
@Injectable()
export class SecretTemplateService extends BaseService<SecretTemplate> {
    /**
     * Constructor
     * @param SecretTemplateRepository Secret template repository
     */
    constructor(
        @InjectRepository(SecretTemplate)
        private readonly SecretTemplateRepository: Repository<SecretTemplate>,
    ) {
        super(SecretTemplateRepository);
    }

    /**
     * Create secret template
     * @param createSecretTemplateDto Create secret template DTO
     * @returns Created secret template
     */
    async createTemplate(
        createSecretTemplateDto: CreateSecretTemplateDto,
    ): Promise<Partial<SecretTemplate>> {
        // Check if template name already exists
        const existTemplate = await super.findOne({
            where: { name: createSecretTemplateDto.name },
        });

        if (existTemplate) {
            throw HttpErrorFactory.business(
                `模板名称 ${createSecretTemplateDto.name} 已存在`,
                BusinessCode.DATA_ALREADY_EXISTS,
            );
        }

        // Validate field configuration legality
        this.validateFieldConfig(createSecretTemplateDto.fieldConfig);

        // Create template
        return await super.create(createSecretTemplateDto);
    }

    /**
     * Update secret template
     * @param id Template ID
     * @param updateSecretTemplateDto Update secret template DTO
     * @returns Updated secret template
     */
    async updateTemplateById(
        id: string,
        updateSecretTemplateDto: UpdateSecretTemplateDto,
    ): Promise<Partial<SecretTemplate>> {
        // Check if template exists
        const template = await super.findOneById(id);
        if (!template) {
            throw HttpErrorFactory.notFound("密钥模板不存在");
        }

        // If template name is updated, check if new template name already exists
        if (updateSecretTemplateDto.name && updateSecretTemplateDto.name !== template.name) {
            const existTemplate = await super.findOne({
                where: { name: updateSecretTemplateDto.name },
            });

            if (existTemplate) {
                throw HttpErrorFactory.business(
                    `模板名称 ${updateSecretTemplateDto.name} 已存在`,
                    BusinessCode.DATA_ALREADY_EXISTS,
                );
            }
        }

        // Validate field configuration legality
        if (updateSecretTemplateDto.fieldConfig) {
            this.validateFieldConfig(updateSecretTemplateDto.fieldConfig);
        }

        return await super.updateById(id, updateSecretTemplateDto);
    }

    /**
     * Paginated query for secret templates
     * @param querySecretTemplateDto Query secret template DTO
     * @returns Pagination result
     */
    async list(querySecretTemplateDto: QuerySecretTemplateDto) {
        const { name, isEnabled, ...paginationDto } = querySecretTemplateDto;

        // Build query conditions
        const whereConditions = buildWhere<SecretTemplate>({
            name: name ? Like(`%${name}%`) : undefined,
            isEnabled,
        });

        return await super.paginate(paginationDto as PaginationDto, {
            where: whereConditions,
            order: {
                sortOrder: "DESC",
                createdAt: "DESC",
            },
        });
    }

    /**
     * Get all enabled templates
     * @returns Enabled template list
     */
    async getEnabledTemplates(): Promise<SecretTemplate[]> {
        return await super.findAll({
            where: { isEnabled: BooleanNumber.YES },
            relations: ["Secrets"],
            order: {
                sortOrder: "DESC",
                createdAt: "DESC",
            },
        });
    }

    /**
     * Get all templates (including enabled and disabled)
     * @returns All template list
     */
    async getAllTemplates(): Promise<SecretTemplate[]> {
        return await super.findAll({
            relations: ["Secrets"],
            order: {
                sortOrder: "DESC",
                createdAt: "DESC",
            },
        });
    }

    /**
     * Set template enabled status
     * @param id Template ID
     * @param isEnabled Whether enabled
     * @returns Updated template
     */
    async setEnabled(id: string, isEnabled: BooleanNumberType): Promise<Partial<SecretTemplate>> {
        const template = await super.findOneById(id);
        if (!template) {
            throw HttpErrorFactory.notFound("密钥模板不存在");
        }

        return await super.updateById(id, { isEnabled });
    }

    /**
     * Delete template (check if there are associated secret configurations)
     * @param id Template ID
     */
    async delete(id: string): Promise<void> {
        const template = await this.SecretTemplateRepository.findOne({
            where: { id },
            relations: ["Secrets"],
        });

        if (!template) {
            throw HttpErrorFactory.notFound("密钥模板不存在");
        }

        // Check if there are associated secret configurations
        if (template.Secrets && template.Secrets.length > 0) {
            throw HttpErrorFactory.business("该模板下还有密钥配置，无法删除");
        }

        await super.delete(id);
    }

    /**
     * Batch delete templates
     * @param ids Template ID array
     * @returns Number of deleted
     */
    async batchDelete(ids: string[]): Promise<number> {
        if (!ids || ids.length === 0) {
            throw HttpErrorFactory.paramError("请选择要删除的模板");
        }

        // Check if each template has associated secret configurations
        for (const id of ids) {
            const template = await this.SecretTemplateRepository.findOne({
                where: { id },
                relations: ["Secrets"],
            });

            if (template && template.Secrets && template.Secrets.length > 0) {
                throw HttpErrorFactory.business(`模板 "${template.name}" 下还有密钥配置，无法删除`);
            }
        }

        return await super.deleteMany(ids);
    }

    /**
     * Validate field configuration legality
     * @param fieldConfig Field configuration array
     */
    private validateFieldConfig(fieldConfig: any[]): void {
        if (!fieldConfig || fieldConfig.length === 0) {
            throw HttpErrorFactory.paramError("字段配置不能为空");
        }

        // Check if field names are duplicated
        const fieldNames = fieldConfig.map((field) => field.name);
        const uniqueNames = new Set(fieldNames);
        if (fieldNames.length !== uniqueNames.size) {
            throw HttpErrorFactory.paramError("字段名称不能重复");
        }

        // Check required fields
        for (const field of fieldConfig) {
            if (!field.name || !field.type) {
                throw HttpErrorFactory.paramError("字段名称、标签和类型不能为空");
            }

            // Validate field name format (only allow letters, numbers, underscores)
            const fieldName = String(field.name);
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
                throw HttpErrorFactory.paramError(
                    `字段名称 "${fieldName}" 格式不正确，只允许字母、数字、下划线，且不能以数字开头`,
                );
            }
        }
    }

    /**
     * Create secret template by importing JSON
     * @param importDto Import JSON DTO
     * @returns Created secret template list
     */
    async importFromJson(
        importDto: ImportSecretTemplateJsonDto,
    ): Promise<Partial<SecretTemplate>[]> {
        try {
            // Parse JSON data
            const jsonData = JSON.parse(importDto.jsonData);

            // Determine if it's a single template or template array
            const templateDataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

            if (templateDataArray.length === 0) {
                throw HttpErrorFactory.paramError("JSON数据不包含有效的模板信息");
            }

            const results: Partial<SecretTemplate>[] = [];

            // Process template data one by one
            for (const templateData of templateDataArray) {
                // Validate required fields
                if (!templateData.name || !templateData.fieldConfig) {
                    throw HttpErrorFactory.paramError("模板数据缺少必要字段：name或fieldConfig");
                }

                // Build CreateSecretTemplateDto object
                const createDto: CreateSecretTemplateDto = {
                    name: templateData.name,
                    fieldConfig: templateData.fieldConfig,
                    isEnabled:
                        templateData.isEnabled !== undefined
                            ? templateData.isEnabled
                            : BooleanNumber.YES,
                    sortOrder: templateData.sortOrder || 0,
                };

                // Validate field configuration
                this.validateFieldConfig(createDto.fieldConfig);

                // Check if template name already exists
                const existTemplate = await super.findOne({
                    where: { name: createDto.name },
                });

                if (existTemplate) {
                    throw HttpErrorFactory.business(
                        `模板名称 ${createDto.name} 已存在`,
                        BusinessCode.DATA_ALREADY_EXISTS,
                    );
                }

                // Create template
                const result = await super.create(createDto);
                results.push(result);
            }

            return results;
        } catch (error) {
            // Handle JSON parsing error
            if (error instanceof SyntaxError) {
                throw HttpErrorFactory.paramError("JSON格式不正确，无法解析");
            }

            // Throw other errors
            throw error;
        }
    }
}
