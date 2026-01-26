import { BaseService, ExcludeFieldsResult, FieldPath, PaginationResult } from "@buildingai/base";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import {
    ExtensionStatus,
    type ExtensionStatusType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Extension } from "@buildingai/db/entities";
import { FindOptionsWhere, ILike, In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils/helper";
import { Injectable } from "@nestjs/common";

import { CreateExtensionDto } from "../dto/create-extension.dto";
import { QueryExtensionDto } from "../dto/query-extension.dto";
import { UpdateExtensionDto } from "../dto/update-extension.dto";
import { ExtensionConfigService } from "./extension-config.service";
import { ExtensionSchemaService } from "./extension-schema.service";

/**
 * Extension Service
 *
 * Provides CRUD operations and business logic for extensions
 */
@Injectable()
export class ExtensionsService extends BaseService<Extension> {
    /**
     * Constructor
     *
     * @param extensionRepository Extension repository
     */
    constructor(
        @InjectRepository(Extension)
        private readonly extensionRepository: Repository<Extension>,
        private readonly extensionConfigService: ExtensionConfigService,
        private readonly extensionSchemaService: ExtensionSchemaService,
    ) {
        super(extensionRepository);
    }

    /**
     * Create extension
     *
     * @param createExtensionDto Create extension DTO
     * @param options Options configuration
     * @returns Created extension
     */
    async create<E extends readonly FieldPath<Extension>[] | undefined = undefined>(
        createExtensionDto: CreateExtensionDto,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Extension, E>> {
        const existExtension = await this.extensionRepository.findOne({
            where: { identifier: createExtensionDto.identifier },
        });

        if (existExtension) {
            throw HttpErrorFactory.business(
                `Extension identifier ${createExtensionDto.identifier} already exists`,
                BusinessCode.DATA_ALREADY_EXISTS,
            );
        }

        return await super.create(
            {
                ...createExtensionDto,
                status: ExtensionStatus.ENABLED,
                author: createExtensionDto.author,
            },
            options,
        );
    }

    /**
     * Update extension
     *
     * @param id Extension ID
     * @param updateExtensionDto Update extension DTO
     * @param options Options configuration
     * @returns Updated extension
     */
    async updateById<E extends readonly FieldPath<Extension>[] | undefined = undefined>(
        id: string,
        updateExtensionDto: UpdateExtensionDto,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Extension, E>> {
        // Check if extension exists
        const extension = (await super.findOneById(id)) as Extension;

        if (!extension) {
            throw HttpErrorFactory.notFound("Extension not found");
        }

        // If identifier is updated, check if new identifier already exists
        if (
            updateExtensionDto.identifier &&
            updateExtensionDto.identifier !== extension.identifier
        ) {
            const existExtension = await this.extensionRepository.findOne({
                where: { identifier: updateExtensionDto.identifier },
            });

            if (existExtension) {
                throw HttpErrorFactory.business(
                    `Extension identifier ${updateExtensionDto.identifier} already exists`,
                    BusinessCode.DATA_ALREADY_EXISTS,
                );
            }
        }

        return await super.updateById(id, updateExtensionDto, options);
    }

    /**
     * Delete extension
     *
     * @param id Extension ID
     */
    async delete(id: string): Promise<void> {
        // Check if extension exists
        const extension = (await super.findOneById(id)) as Extension;

        if (!extension) {
            throw HttpErrorFactory.notFound("Extension not found");
        }

        await super.delete(id);
        this.logger.log(`Deleting extension from database: ${extension.identifier}`);
    }

    /**
     * Batch delete extensions
     *
     * @param ids Extension ID array
     * @returns Number of deleted extensions
     */
    async deleteMany(ids: string[]): Promise<number> {
        if (!ids || ids.length === 0) {
            throw HttpErrorFactory.paramError("Please select extensions to delete");
        }

        return await super.deleteMany(ids);
    }

    /**
     * Paginate extensions
     *
     * @param queryExtensionDto Query extension DTO
     * @param options Options configuration
     * @returns Pagination result
     */
    async paginate<E extends readonly FieldPath<Extension>[] | undefined = undefined>(
        queryExtensionDto: QueryExtensionDto,
        options?: { excludeFields?: E },
    ): Promise<PaginationResult<ExcludeFieldsResult<Extension, E>>> {
        const { name, identifier, type, status, isLocal, ...pagination } = queryExtensionDto;

        const where = buildWhere<Extension>({
            name: name ? ILike(`%${name}%`) : undefined,
            identifier: identifier ? ILike(`%${identifier}%`) : undefined,
            type,
            status,
            isLocal,
        });

        return await super.paginate(pagination, {
            where,
            order: { createdAt: "DESC" },
            ...options,
        });
    }

    /**
     * Find extension by identifier
     *
     * @param identifier Extension identifier
     * @param options Options configuration
     * @returns Extension entity
     */
    async findByIdentifier<E extends readonly FieldPath<Extension>[] | undefined = undefined>(
        identifier: string,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Extension, E> | null> {
        return await super.findOne({
            where: { identifier },
            ...options,
        });
    }

    /**
     * Set extension status
     *
     * @param id Extension ID
     * @param status Extension status
     * @returns Updated extension
     */
    async setStatus(id: string, status: ExtensionStatusType): Promise<Partial<Extension>> {
        const extension = await super.findOneById(id);

        if (!extension) {
            throw HttpErrorFactory.notFound("Extension not found");
        }

        return await super.updateById(id, { status });
    }

    /**
     * Enable extension
     *
     * @param id Extension ID
     * @returns Updated extension
     */
    async enable(id: string): Promise<Partial<Extension>> {
        const extension = await this.findOneById(id);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension not found");
        }

        // Update extensions.json
        await this.extensionConfigService.updateExtensionsJson(extension.identifier, true);

        return await this.setStatus(id, ExtensionStatus.ENABLED);
    }

    /**
     * Disable extension
     *
     * @param id Extension ID
     * @returns Updated extension
     */
    async disable(id: string): Promise<Partial<Extension>> {
        const extension = await this.findOneById(id);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension not found");
        }

        // Update extensions.json
        await this.extensionConfigService.updateExtensionsJson(extension.identifier, false);

        return await this.setStatus(id, ExtensionStatus.DISABLED);
    }

    /**
     * Find extensions by type
     *
     * @param type Extension type
     * @param onlyEnabled Whether to return only enabled extensions, default is true
     * @param options Options configuration
     * @returns Extension list
     */
    async findByType<E extends readonly FieldPath<Extension>[] | undefined = undefined>(
        type: ExtensionTypeType,
        onlyEnabled: boolean = true,
        options?: { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<Extension, E>[]> {
        const where: FindOptionsWhere<Extension> = { type };

        if (onlyEnabled) {
            where.status = ExtensionStatus.ENABLED;
        }

        return await super.findAll({
            where,
            order: { createdAt: "DESC" },
            ...options,
        });
    }

    /**
     * Find all enabled extensions
     *
     * @param options Options configuration
     * @returns Extension list
     */
    async findAllEnabled<
        E extends readonly FieldPath<Extension>[] | undefined = undefined,
    >(options?: { excludeFields?: E }): Promise<ExcludeFieldsResult<Extension, E>[]> {
        return await super.findAll({
            where: { status: ExtensionStatus.ENABLED },
            order: { createdAt: "DESC" },
            ...options,
        });
    }

    /**
     * Find all local development extensions
     *
     * @param options Options configuration
     * @returns Extension list
     */
    async findAllLocal<
        E extends readonly FieldPath<Extension>[] | undefined = undefined,
    >(options?: { excludeFields?: E }): Promise<ExcludeFieldsResult<Extension, E>[]> {
        return await super.findAll({
            where: { isLocal: true },
            order: { createdAt: "DESC" },
            ...options,
        });
    }

    /**
     * Check if extension identifier exists
     *
     * @param identifier Extension identifier
     * @param excludeId Extension ID to exclude (for update check)
     * @returns Whether exists
     */
    async isIdentifierExists(identifier: string, excludeId?: string): Promise<boolean> {
        if (!identifier) {
            return false;
        }

        const where: FindOptionsWhere<Extension> = { identifier };

        const extension = await super.findOne({ where });

        if (!extension) {
            return false;
        }

        // If excludeId is provided, check if the found extension is the one to exclude
        if (excludeId && extension.id === excludeId) {
            return false;
        }

        return true;
    }

    /**
     * Batch update extension status
     *
     * @param ids Extension ID array
     * @param status Extension status
     * @returns Number of updated extensions
     */
    async batchUpdateStatus(ids: string[], status: ExtensionStatusType): Promise<number> {
        if (!ids || ids.length === 0) {
            throw HttpErrorFactory.paramError("Please select extensions to update");
        }

        const extensions = await this.extensionRepository.findBy({ id: In(ids) });

        console.log("extensions", extensions);

        if (extensions.length === 0) {
            throw HttpErrorFactory.notFound("Extensions to update not found");
        }

        // Update status
        await this.extensionRepository.update({ id: In(ids) }, { status });

        return extensions.length;
    }

    /**
     * Check if database schema exists
     *
     * @param schemaName Schema name
     * @returns True if schema exists, false otherwise
     */
    async checkSchemaExists(schemaName: string): Promise<boolean> {
        return await this.extensionSchemaService.checkSchemaExists(schemaName);
    }

    /**
     * Drop database schema
     *
     * @param schemaName Schema name
     */
    async dropSchema(schemaName: string): Promise<void> {
        return await this.extensionSchemaService.dropSchema(schemaName);
    }
}
