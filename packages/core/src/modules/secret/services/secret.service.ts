import { BaseService, ExcludeFieldsResult, FieldPath } from "@buildingai/base";
import { BooleanNumber, type BooleanNumberType } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { SecretTemplate } from "@buildingai/db/entities";
import { Secret } from "@buildingai/db/entities";
import { Like, Raw, Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere, decryptValue } from "@buildingai/utils";
import { Inject, Injectable, Optional } from "@nestjs/common";

import {
    CreateSecretDto,
    QuerySecretDto,
    SecretUsageDto,
    UpdateSecretDto,
} from "../dto/secret.dto";

/**
 * AI Provider Service interface for dependency injection
 */
export interface IAiProviderService {
    findAll(options: any): Promise<any[]>;
    updateById(id: string, data: any): Promise<any>;
}

/**
 * Secret configuration service
 */
@Injectable()
export class SecretService extends BaseService<Secret> {
    /**
     * Constructor
     * @param SecretRepository Secret configuration repository
     * @param SecretTemplateRepository Secret template repository
     * @param aiProviderService AI Provider service (optional)
     */
    constructor(
        @InjectRepository(Secret)
        private readonly SecretRepository: Repository<Secret>,
        @InjectRepository(SecretTemplate)
        private readonly SecretTemplateRepository: Repository<SecretTemplate>,
        @Optional()
        @Inject("AI_PROVIDER_SERVICE")
        private readonly aiProviderService?: IAiProviderService,
    ) {
        super(SecretRepository);
    }

    /**
     * Create secret configuration
     * @param createSecretDto Create secret configuration DTO
     * @param options Option configuration
     * @returns Created secret configuration
     */
    async create<E extends readonly FieldPath<Secret>[] | undefined = undefined>(
        createSecretDto: CreateSecretDto,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Secret, E>> {
        // Check if template exists and is enabled
        const template = await this.SecretTemplateRepository.findOne({
            where: {
                id: createSecretDto.templateId,
                isEnabled: BooleanNumber.YES,
            },
        });

        if (!template) {
            throw HttpErrorFactory.business("所选模板不存在或已被禁用");
        }

        // Check if configuration name already exists under the same template
        const existConfig = await super.findOne({
            where: {
                name: createSecretDto.name,
                templateId: createSecretDto.templateId,
            },
        });

        if (existConfig) {
            throw HttpErrorFactory.business(
                `在模板 ${template.name} 下，配置名称 ${createSecretDto.name} 已存在`,
            );
        }

        // Validate field values match template field configuration
        this.validateFieldValues(createSecretDto.fieldValues, template.fieldConfig);

        // Process sensitive field encryption
        const processedFieldValues = this.processFieldValues(createSecretDto.fieldValues);
        // Create configuration
        const configData = {
            ...createSecretDto,
            fieldValues: processedFieldValues,
        };

        return await super.create(configData, options);
    }

    /**
     * Update secret configuration
     * @param id Configuration ID
     * @param updateSecretDto Update secret configuration DTO
     * @param options Option configuration
     * @returns Updated secret configuration
     */
    async updateById<E extends readonly FieldPath<Secret>[] | undefined = undefined>(
        id: string,
        updateSecretDto: UpdateSecretDto,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Secret, E>> {
        // Check if configuration exists
        const config = await this.SecretRepository.findOne({
            where: { id },
            relations: ["template"],
        });

        if (!config) {
            throw HttpErrorFactory.notFound("密钥配置不存在");
        }

        // Check if template ID is updated
        let templateToUse = config.template;
        if (updateSecretDto.templateId && updateSecretDto.templateId !== config.templateId) {
            // Get new template
            const newTemplate = await this.SecretTemplateRepository.findOne({
                where: {
                    id: updateSecretDto.templateId,
                    isEnabled: BooleanNumber.YES,
                },
            });

            if (!newTemplate) {
                throw HttpErrorFactory.business("所选模板不存在或已被禁用");
            }

            templateToUse = newTemplate;

            // Check if configuration name already exists under new template
            const nameToCheck = updateSecretDto.name || config.name;
            const existConfig = await super.findOne({
                where: {
                    name: nameToCheck,
                    templateId: updateSecretDto.templateId,
                    id: Raw((alias) => `${alias} != '${id}'`), // Exclude current configuration
                },
            });

            if (existConfig) {
                throw HttpErrorFactory.business(
                    `在模板 ${newTemplate.name} 下，配置名称 ${nameToCheck} 已存在`,
                );
            }
        } else if (updateSecretDto.name && updateSecretDto.name !== config.name) {
            // If only configuration name is updated, check if new name already exists under same template
            const existConfig = await super.findOne({
                where: {
                    name: updateSecretDto.name,
                    templateId: config.templateId,
                    id: Raw((alias) => `${alias} != '${id}'`), // Exclude current configuration
                },
            });

            if (existConfig) {
                throw HttpErrorFactory.business(
                    `在模板 ${config.template.name} 下，配置名称 ${updateSecretDto.name} 已存在`,
                );
            }
        }

        // If field values or template ID is updated, validate match with template
        if (
            updateSecretDto.fieldValues ||
            (updateSecretDto.templateId && updateSecretDto.templateId !== config.templateId)
        ) {
            // If template is updated but no new field values provided, use original field values for validation
            const fieldValuesToValidate = updateSecretDto.fieldValues || config.fieldValues;
            this.validateFieldValues(fieldValuesToValidate, templateToUse.fieldConfig);

            if (updateSecretDto.fieldValues) {
                updateSecretDto.fieldValues = this.processFieldValues(updateSecretDto.fieldValues);
            }
        }

        return await super.updateById(id, updateSecretDto, options);
    }

    /**
     * Paginated query for secret configurations
     * @param querySecretDto Query secret configuration DTO
     * @returns Pagination result
     */
    async list(querySecretDto: QuerySecretDto) {
        const { name, templateId, status, ...paginationDto } = querySecretDto;

        // Build query conditions
        const whereConditions = buildWhere<Secret>({
            name: name ? Like(`%${name}%`) : undefined,
            templateId,
            status,
        });

        return await super.paginate(paginationDto as PaginationDto, {
            where: whereConditions,
            relations: ["template"],
            order: {
                sortOrder: "DESC",
                createdAt: "DESC",
            },
            excludeFields: ["fieldValues"], // Do not return sensitive field values by default
        });
    }

    /**
     * Get configuration detail by ID (including field values)
     * @param id Configuration ID
     * @returns Configuration detail
     */
    async getConfigDetail(id: string): Promise<any> {
        const config = await this.SecretRepository.findOne({
            where: { id },
            relations: ["template"],
        });

        if (!config) {
            throw HttpErrorFactory.notFound("密钥配置不存在");
        }

        // Process field value display - always return decrypted values
        const processedConfig = { ...config };
        processedConfig.fieldValues = this.decryptFieldValues(config.fieldValues);

        return processedConfig;
    }

    /**
     * Get configuration list by template ID
     * @param templateId Template ID
     * @param onlyActive Whether to return only active configurations
     * @returns Configuration list with decrypted field values
     */
    async getConfigsByTemplate(templateId: string, onlyActive: boolean = true): Promise<any[]> {
        const whereConditions = buildWhere<Secret>({
            templateId,
            status: onlyActive ? true : undefined,
        });

        const configs = await super.findAll({
            where: whereConditions,
            order: {
                sortOrder: "DESC",
                createdAt: "DESC",
            },
        });

        // Decrypt field values for each configuration
        return configs.map((config) => ({
            ...config,
            fieldValues: this.decryptFieldValues(config.fieldValues || []),
        }));
    }

    /**
     * Set configuration status
     * @param id Configuration ID
     * @param status Configuration status
     * @returns Updated configuration
     */
    async setStatus(id: string, status: BooleanNumberType): Promise<Partial<Secret>> {
        const config = await super.findOneById(id);
        if (!config) {
            throw HttpErrorFactory.notFound("密钥配置不存在");
        }

        return await super.updateById(id, { status });
    }

    /**
     * Delete secret configuration
     * @param id Secret configuration ID
     */
    async delete(id: string): Promise<void> {
        // First check if secret configuration exists
        const config = await super.findOneById(id);
        if (!config) {
            throw HttpErrorFactory.notFound("密钥配置不存在");
        }

        try {
            // Query and update all AI providers bound to this secret configuration
            if (this.aiProviderService) {
                const aiProviders = await this.aiProviderService.findAll({
                    where: { bindSecretId: id },
                });

                // Clear bindSecretId for all providers
                for (const provider of aiProviders) {
                    await this.aiProviderService.updateById(provider.id, {
                        bindSecretId: null,
                        // If provider is active, set to inactive
                        isActive: false,
                    });
                    this.logger.log(
                        `已清除AI供应商 ${provider.name}(${provider.id}) 的密钥配置绑定`,
                    );
                }
            }

            // Delete secret configuration
            await super.delete(id);
            this.logger.log(`密钥配置 ${id} 删除成功`);
        } catch (error) {
            this.logger.error(`删除密钥配置失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal("删除密钥配置失败");
        }
    }

    /**
     * Batch delete secret configurations
     * @param ids Secret configuration ID array
     * @returns Number of successfully deleted
     */
    async batchDelete(ids: string[]): Promise<number> {
        if (!ids || ids.length === 0) {
            return 0;
        }

        let successCount = 0;
        const errors = [];

        for (const id of ids) {
            try {
                // Query and update all AI providers bound to this secret configuration
                if (this.aiProviderService) {
                    const aiProviders = await this.aiProviderService.findAll({
                        where: { bindSecretId: id },
                    });

                    // Clear bindSecretId for all providers
                    for (const provider of aiProviders) {
                        await this.aiProviderService.updateById(provider.id, {
                            bindSecretId: null,
                            // If provider is active, set to inactive
                            isActive: false,
                        });
                        this.logger.log(
                            `已清除AI供应商 ${provider.name}(${provider.id}) 的密钥配置绑定`,
                        );
                    }
                }

                // Delete secret configuration
                await super.delete(id);
                this.logger.log(`密钥配置 ${id} 删除成功`);
                successCount++;
            } catch (error) {
                this.logger.error(`删除密钥配置 ${id} 失败: ${error.message}`, error.stack);
                errors.push({ id, message: error.message });
            }
        }

        if (errors.length > 0 && successCount === 0) {
            throw HttpErrorFactory.internal(`批量删除密钥配置失败: ${JSON.stringify(errors)}`);
        }

        return successCount;
    }

    /**
     * Record configuration usage
     * @param SecretUsageDto Usage statistics DTO
     */
    async recordUsage(SecretUsageDto: SecretUsageDto): Promise<void> {
        const { configId } = SecretUsageDto;

        const config = await super.findOneById(configId);
        if (!config) {
            throw HttpErrorFactory.notFound("密钥配置不存在");
        }

        // Update usage statistics
        await super.updateById(configId, {
            lastUsedAt: new Date(),
            usageCount: (config.usageCount || 0) + 1,
        });
    }

    /**
     * Check and update expired status
     * Note: Since status is changed to boolean, this method is no longer needed
     */
    async checkAndUpdateExpiredConfigs(): Promise<number> {
        // After status is changed to boolean, there is no concept of expired status
        return 0;
    }

    /**
     * Get configuration key-value pairs
     * @param id Configuration ID
     * @returns Configuration key-value pair object, value includes value and required properties
     */
    async getConfigKeyValuePairs(
        id: string,
    ): Promise<Record<string, { value: string; required: boolean }>> {
        const config = await this.SecretRepository.findOne({
            where: { id },
            relations: ["template"],
        });

        if (!config) {
            throw HttpErrorFactory.notFound("密钥配置不存在");
        }

        // Create template field mapping for easy lookup of field's required property
        const templateFieldMap = new Map();
        if (config.template && config.template.fieldConfig) {
            config.template.fieldConfig.forEach((field) => {
                templateFieldMap.set(field.name, field);
            });
        }

        // Convert field configuration to key-value pairs
        const keyValuePairs: Record<string, { value: string; required: boolean }> = {};

        if (config.fieldValues && Array.isArray(config.fieldValues)) {
            config.fieldValues.forEach((field) => {
                if (field.name && field.value !== undefined) {
                    // If field is encrypted, decrypt first
                    const value = field.encrypted ? decryptValue(field.value) : field.value;

                    // Get field configuration information from template
                    const templateField = templateFieldMap.get(field.name);

                    keyValuePairs[field.name] = {
                        value: value || "",
                        required: templateField?.required || false,
                    };
                }
            });
        }

        return keyValuePairs;
    }

    /**
     * Get configuration statistics
     * @param templateId Optional template ID for filtering specific template statistics
     * @returns Statistics information
     */
    async getConfigStats(templateId?: string): Promise<any> {
        const queryBuilder = this.SecretRepository.createQueryBuilder("config");

        if (templateId) {
            queryBuilder.where("config.templateId = :templateId", {
                templateId,
            });
        }

        const [total, active, inactive] = await Promise.all([
            queryBuilder.getCount(),
            queryBuilder.clone().andWhere("config.status = :status", { status: true }).getCount(),
            queryBuilder.clone().andWhere("config.status = :status", { status: false }).getCount(),
        ]);

        return {
            total,
            active,
            inactive,
        };
    }

    /**
     * Validate field values match template field configuration
     * @param fieldValues Field value array
     * @param templateFields Template field configuration array
     */
    private validateFieldValues(fieldValues: any[], templateFields: any[]): void {
        // Create template field mapping
        const templateFieldMap = new Map();
        templateFields.forEach((field) => {
            templateFieldMap.set(field.name, field);
        });

        // Validate required fields
        const requiredFields = templateFields.filter((field) => field.required);
        const providedFieldNames = fieldValues.map((fv) => fv.name);

        for (const requiredField of requiredFields) {
            if (!providedFieldNames.includes(requiredField.name)) {
                throw HttpErrorFactory.paramError(`必填字段 "${requiredField.label}" 不能为空`);
            }
        }

        // Validate field values
        for (const fieldValue of fieldValues) {
            const templateField = templateFieldMap.get(fieldValue.name);
            if (!templateField) {
                throw HttpErrorFactory.paramError(`字段 "${fieldValue.name}" 不存在于模板中`);
            }

            // For required fields, validate value cannot be empty
            if (templateField.required) {
                const value = fieldValue.value;
                if (value === undefined || value === null || value === "") {
                    throw HttpErrorFactory.paramError(
                        `必填字段 "${templateField.label || fieldValue.name}" 的值不能为空`,
                    );
                }
            }
        }
    }

    /**
     * Process field values (encrypt sensitive fields)
     * @param fieldValues Field value array
     * @returns Processed field value array
     */
    private processFieldValues(fieldValues: any[]): any[] {
        return fieldValues.map((fieldValue) => {
            // Ensure even empty values are saved, convert undefined and null to empty string
            const processedValue = fieldValue.value ?? "";

            // For password type fields, mark as encrypted
            if (
                fieldValue.name.toLowerCase().includes("password") ||
                fieldValue.name.toLowerCase().includes("secret") ||
                fieldValue.name.toLowerCase().includes("key")
            ) {
                return {
                    ...fieldValue,
                    encrypted: true,
                    // Should actually encrypt here, simplified for now
                    value: this.encryptValue(String(processedValue)),
                };
            }
            return {
                ...fieldValue,
                value: processedValue,
            };
        });
    }

    /**
     * Encrypt field value (simplified implementation)
     * @param value Original value
     * @returns Encrypted value
     */
    private encryptValue(value: string): string {
        // Should use real encryption algorithm here, using Base64 encoding as example for now
        return Buffer.from(value).toString("base64");
    }

    /**
     * Decrypt field values (simplified implementation)
     * @param fieldValues Field value array
     * @returns Decrypted field value array
     */
    private decryptFieldValues(fieldValues: any[]): any[] {
        return fieldValues.map((fieldValue) => {
            if (fieldValue.encrypted) {
                return {
                    ...fieldValue,
                    value: decryptValue(String(fieldValue.value)),
                };
            }
            return fieldValue;
        });
    }

    /**
     * Decrypt field value (simplified implementation)
     * @param encryptedValue Encrypted value
     * @returns Decrypted value
     */
    private decryptValue(encryptedValue: string): string {
        try {
            return Buffer.from(encryptedValue, "base64").toString();
        } catch {
            return encryptedValue; // Return original value if decryption fails
        }
    }

    /**
     * Mask sensitive fields
     * @param fieldValues Field value array
     * @returns Masked field value array
     */
    private maskSensitiveFields(fieldValues: any[]): any[] {
        return fieldValues.map((fieldValue) => {
            if (fieldValue.encrypted) {
                return {
                    ...fieldValue,
                    value: "******", // Mask sensitive fields with asterisks
                };
            }
            return fieldValue;
        });
    }
}
