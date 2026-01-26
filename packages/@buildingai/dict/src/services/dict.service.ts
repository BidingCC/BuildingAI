import { BaseService, ExcludeFieldsResult, FieldPath } from "@buildingai/base";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { FileUrlService } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { FileUrlProcessorUtil } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { DICT_CACHE_EVENTS } from "../constants/dict-events.constant";
import { CreateDictDto } from "../dto/create-dict.dto";
import { UpdateDictDto } from "../dto/update-dict.dto";

/**
 * Dictionary Configuration Service
 *
 * Provides CRUD operations and caching management for dictionary configurations
 */
@Injectable()
export class DictService extends BaseService<Dict> {
    /**
     * Constructor
     * @param dictRepository Dictionary configuration repository
     * @param eventEmitter Event emitter for cache synchronization
     */
    constructor(
        @InjectRepository(Dict)
        private readonly dictRepository: Repository<Dict>,
        private readonly eventEmitter: EventEmitter2,
        private readonly fileUrlService: FileUrlService,
    ) {
        super(dictRepository);
    }

    /**
     * Create dictionary configuration
     * @param createDictDto Create dictionary configuration DTO
     * @param options Optional fields to exclude
     * @returns Created dictionary configuration
     */
    async create<E extends readonly FieldPath<Dict>[] | undefined = undefined>(
        createDictDto: CreateDictDto,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Dict, E>> {
        // Check if configuration key already exists
        const existDict = await super.findOne({
            where: { key: createDictDto.key },
        });

        if (existDict) {
            throw HttpErrorFactory.business(
                `Configuration key ${createDictDto.key} already exists`,
                BusinessCode.DATA_ALREADY_EXISTS,
            );
        }

        // Create configuration
        const dict = await super.create(createDictDto, options);

        // Emit dictionary update event
        this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_UPDATED, dict);

        return dict;
    }

    /**
     * Get dictionary configuration value
     * @param key Configuration key
     * @param group Configuration group, defaults to 'default'
     * @returns Configuration value (automatically converted to appropriate type)
     */
    async getValue<T = any>(key: string, group: string = "default"): Promise<T> {
        const dict = await super.findOne({
            where: { key, group },
        });

        if (!dict) {
            throw HttpErrorFactory.business(
                `Configuration ${key} does not exist in group ${group}`,
            );
        }

        if (!dict.isEnabled) {
            throw HttpErrorFactory.business(`Configuration ${key} is disabled`);
        }

        return this.parseValue<T>(dict.value);
    }

    /**
     * Simplified method to get configuration
     * @param key Configuration key
     * @param defaultValue Default value (returned if configuration doesn't exist or is disabled)
     * @param group Configuration group, defaults to 'default'
     * @param options Optional parameters for processing
     * @returns Configuration value (automatically converted to appropriate type)
     *
     * @example
     * ```typescript
     * // With file URL restoration using wildcard patterns
     * const config = await dictService.get('config', undefined, 'app', {
     *     restoreFileUrlFields: ['heroImageUrl', '**.iconUrl'],
     * });
     * ```
     */
    async get<T = any>(
        key: string,
        defaultValue?: T,
        group: string = "default",
        options?: {
            /** Field patterns to restore file URLs (supports wildcards: *, **) */
            restoreFileUrlFields?: string[];
        },
    ): Promise<T> {
        try {
            const dict = await super.findOne({
                where: { key, group, isEnabled: true },
            });

            if (!dict) {
                return defaultValue as T;
            }

            let result = this.parseValue<T>(dict.value);

            // Restore file URL fields if specified
            if (options?.restoreFileUrlFields?.length && result && typeof result === "object") {
                result = await this.restoreFileUrlFields(result, options.restoreFileUrlFields);
            }

            return result;
        } catch (error) {
            this.logger.error(`get dict failed: ${key}@${group}`, error);
            return defaultValue as T;
        }
    }

    /**
     * Simplified method to set configuration
     * @param key Configuration key
     * @param value Configuration value (will be automatically converted to JSON string)
     * @param options Optional parameters (group, description, normalizeFileUrlFields, etc.)
     * @returns Configuration entity
     *
     * @example
     * ```typescript
     * // With file URL normalization using wildcard patterns
     * await dictService.set('config', payload, {
     *     group: 'app',
     *     normalizeFileUrlFields: [
     *         'heroImageUrl',        // exact field
     *         '**.iconUrl',          // any depth with field name 'iconUrl'
     *         'items.*.avatar',      // array items avatar field
     *     ],
     * });
     * ```
     */
    async set<T = any>(
        key: string,
        value: T,
        options?: {
            group?: string;
            description?: string;
            sort?: number;
            isEnabled?: boolean;
            /** Field patterns to normalize file URLs (supports wildcards: *, **) */
            normalizeFileUrlFields?: string[];
        },
    ): Promise<Partial<Dict>> {
        const group = options?.group || "default";

        // Process file URL fields if specified
        let processedValue = value;
        if (options?.normalizeFileUrlFields?.length && value) {
            // Handle string value directly (e.g., single URL field)
            if (typeof value === "string") {
                processedValue = (await this.fileUrlService.set(value)) as T;
            } else if (typeof value === "object") {
                processedValue = await this.normalizeFileUrlFields(
                    value,
                    options.normalizeFileUrlFields,
                );
            }
        }

        // Check if configuration already exists (check both key and group)
        const existDict = await super.findOne({
            where: { key, group },
        });

        // Convert value to string
        const stringValue = this.stringifyValue(processedValue);

        if (existDict) {
            // Update existing configuration, preserve original group
            const updateData: UpdateDictDto = {
                value: stringValue,
                description:
                    options?.description !== undefined
                        ? options.description
                        : existDict.description,
                sort: options?.sort !== undefined ? options.sort : existDict.sort,
                isEnabled:
                    options?.isEnabled !== undefined ? options.isEnabled : existDict.isEnabled,
            };

            return super.updateById(existDict.id, updateData);
        } else {
            // Create new configuration
            const createData: CreateDictDto = {
                key,
                value: stringValue,
                group,
                description: options?.description,
                sort: options?.sort || 0,
                isEnabled: options?.isEnabled !== undefined ? options.isEnabled : true,
            };

            return super.create(createData);
        }
    }

    /**
     * Normalize file URL fields in an object (remove domain prefix)
     * @param data Data object to process
     * @param fieldPatterns Field patterns (supports *, ** wildcards)
     * @returns Processed data with normalized file URLs
     */
    private async normalizeFileUrlFields<T>(data: T, fieldPatterns: string[]): Promise<T> {
        // Deep clone to avoid mutating original data
        const clonedData = JSON.parse(JSON.stringify(data));

        // Clear cache before processing to avoid conflicts between get/set operations
        FileUrlProcessorUtil.clearCache();

        return FileUrlProcessorUtil.processFieldsEfficiently(
            clonedData,
            fieldPatterns,
            async (url: string) => this.fileUrlService.set(url),
        );
    }

    /**
     * Restore file URL fields in an object (add domain prefix)
     * @param data Data object to process
     * @param fieldPatterns Field patterns (supports *, ** wildcards)
     * @returns Processed data with restored file URLs
     */
    private async restoreFileUrlFields<T>(data: T, fieldPatterns: string[]): Promise<T> {
        // Deep clone to avoid mutating original data
        const clonedData = JSON.parse(JSON.stringify(data));

        // Clear cache before processing to avoid conflicts between get/set operations
        FileUrlProcessorUtil.clearCache();

        return FileUrlProcessorUtil.processFieldsEfficiently(
            clonedData,
            fieldPatterns,
            async (path: string) => this.fileUrlService.get(path),
        );
    }

    /**
     * Convert any value to storage string
     * @param value Value to convert
     * @returns Storage string
     */
    private stringifyValue(value: any): string {
        // For simple types, convert directly to string
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "string") {
            return value;
        }

        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }

        // Convert other complex types to JSON
        return JSON.stringify(value);
    }

    /**
     * Parse stored string to appropriate type
     * @param value Stored string value
     * @returns Parsed value
     */
    public parseValue<T = any>(value: string): T {
        if (!value) {
            return null as unknown as T;
        }

        // Try to parse as JSON
        try {
            // Check if it might be JSON
            if (
                (value.startsWith("{") && value.endsWith("}")) ||
                (value.startsWith("[") && value.endsWith("]")) ||
                value === "true" ||
                value === "false" ||
                value === "null" ||
                !isNaN(Number(value))
            ) {
                return JSON.parse(value) as T;
            }
        } catch (e) {
            this.logger.error(`parse dict value failed: ${value}`, e);
            // Parse failed, ignore error
        }

        // If not JSON, return original string
        return value as unknown as T;
    }

    /**
     * Update dictionary configuration
     * @param id Dictionary configuration ID
     * @param updateDictDto Update dictionary configuration DTO
     * @param options Optional fields to exclude
     * @returns Updated dictionary configuration
     */
    async updateById<E extends readonly FieldPath<Dict>[] | undefined = undefined>(
        id: string,
        updateDictDto: UpdateDictDto,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Dict, E>> {
        // Check if configuration exists
        const dict = (await super.findOneById(id)) as Dict;

        // If configuration key is updated, check if new key already exists
        if (updateDictDto.key && updateDictDto.key !== dict.key) {
            const existDict = await this.dictRepository.findOne({
                where: { key: updateDictDto.key },
            });

            if (existDict) {
                throw HttpErrorFactory.business(
                    `Configuration key ${updateDictDto.key} already exists`,
                    BusinessCode.DATA_ALREADY_EXISTS,
                );
            }
        }

        const updatedDict = await super.updateById(id, updateDictDto, options);

        // Emit dictionary update event
        this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_UPDATED, updatedDict);

        return updatedDict;
    }

    /**
     * Delete dictionary configuration by ID
     * @param id Dictionary configuration ID
     */
    async remove(id: string): Promise<void> {
        // Get dictionary configuration to delete
        const dict = (await super.findOneById(id)) as Dict;

        if (dict) {
            await super.delete(id);

            // Emit dictionary deletion event
            this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_DELETED, {
                key: dict.key,
                group: dict.group,
            });
        }
    }

    /**
     * Batch delete dictionary configurations
     * @param ids Array of dictionary configuration IDs
     */
    async batchRemove(ids: string[]): Promise<void> {
        if (!ids || ids.length === 0) {
            throw HttpErrorFactory.paramError("Please select configurations to delete");
        }

        // Get dictionary configurations to delete
        const dicts = await this.dictRepository.findByIds(ids);

        await super.deleteMany(ids);

        // Emit dictionary deletion events
        for (const dict of dicts) {
            this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_DELETED, {
                key: dict.key,
                group: dict.group,
            });
        }
    }

    /**
     * Set dictionary configuration enabled status
     * @param id Dictionary configuration ID
     * @param isEnabled Whether to enable
     * @returns Updated dictionary configuration
     */
    async setEnabled(id: string, isEnabled: boolean): Promise<Partial<Dict>> {
        // Update enabled status
        const updatedDict = await super.updateById(id, { isEnabled });

        // Emit dictionary update event
        this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_UPDATED, updatedDict);

        return updatedDict;
    }

    /**
     * Enable or disable configuration by key
     * @param key Configuration key
     * @param isEnabled Whether to enable
     * @param group Configuration group, defaults to 'default'
     * @returns Updated dictionary configuration
     */
    async enable(
        key: string,
        isEnabled: boolean = true,
        group: string = "default",
    ): Promise<Partial<Dict>> {
        const dict = await super.findOne({
            where: { key, group },
        });

        if (!dict) {
            throw HttpErrorFactory.business(
                `Configuration ${key} does not exist in group ${group}`,
            );
        }

        const updatedDict = await super.updateById(dict.id, { isEnabled });

        // Emit dictionary update event
        this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_UPDATED, updatedDict);

        return updatedDict;
    }

    /**
     * Query all configuration records by group
     * @param group Configuration group
     * @param onlyEnabled Whether to return only enabled configurations, defaults to true
     * @returns Array of configuration records
     */
    async getByGroup(group: string, onlyEnabled: boolean = true): Promise<Dict[]> {
        const whereCondition: any = { group };

        // If only querying enabled configurations
        if (onlyEnabled) {
            whereCondition.isEnabled = true;
        }

        return await this.dictRepository.find({
            where: whereCondition,
            order: {
                sort: "ASC",
                createdAt: "DESC",
            },
        });
    }

    /**
     * Get configuration value mapping by group
     * @param group Configuration group
     * @param onlyEnabled Whether to return only enabled configurations, defaults to true
     * @returns Configuration key-value pair mapping
     */
    async getGroupValues<T = any>(
        group: string,
        onlyEnabled: boolean = true,
    ): Promise<Record<string, T>> {
        const configs = await this.getByGroup(group, onlyEnabled);
        const result: Record<string, any> = {};

        for (const config of configs) {
            result[config.key] = this.parseValue(config.value);
        }

        return result as Record<string, T>;
    }

    /**
     * Delete configuration
     * @param key Configuration key
     * @param group Configuration group, defaults to 'default'
     * @returns Whether deletion was successful
     */
    async deleteByKey(key: string, group: string = "default"): Promise<boolean> {
        try {
            const dict = (await super.findOne({
                where: { key, group },
            })) as Dict;

            if (!dict) {
                return false;
            }

            await super.delete(dict.id);

            // Emit dictionary deletion event
            this.eventEmitter.emit(DICT_CACHE_EVENTS.DICT_DELETED, {
                key,
                group,
            });

            return true;
        } catch (error) {
            this.logger.error(`delete dict failed: ${key}@${group}`, error);
            return false;
        }
    }
}
