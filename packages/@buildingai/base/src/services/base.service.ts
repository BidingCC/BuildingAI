import {
    DataSource,
    DeepPartial,
    EntityManager,
    FindManyOptions,
    FindOptionsWhere,
    ILike,
    In,
    OptimisticLockVersionMismatchError,
    QueryRunner,
    Raw,
    Repository,
    SelectQueryBuilder,
} from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { isArray } from "class-validator";

/**
 * 锁类型枚举
 */
export enum LockType {
    /** 乐观锁 - 基于版本号控制 */
    OPTIMISTIC = "optimistic",
    /** 悲观锁 - 共享锁（读锁） */
    PESSIMISTIC_READ = "pessimistic_read",
    /** 悲观锁 - 排他锁（写锁） */
    PESSIMISTIC_WRITE = "pessimistic_write",
    /** 悲观锁 - 部分写锁 */
    PESSIMISTIC_PARTIAL_WRITE = "pessimistic_partial_write",
    /** 悲观锁 - 写锁且跳过锁定的行 */
    PESSIMISTIC_WRITE_OR_FAIL = "pessimistic_write_or_fail",
}

/**
 * 锁配置接口
 */
export interface LockOptions {
    /** 锁类型 */
    type: LockType;
    /** 锁超时时间（毫秒） */
    timeout?: number;
    /** 重试次数 */
    retryCount?: number;
    /** 重试间隔（毫秒） */
    retryDelay?: number;
    /** 版本号字段名（乐观锁使用） */
    versionField?: string;
}

/**
 * 分页结果接口
 *
 * 定义标准的分页返回数据结构
 */
export interface PaginationResult<T> {
    /** 数据列表 */
    items: T[];

    /** 总记录数 */
    total: number;

    /** 当前页码 */
    page: number;

    /** 每页条数 */
    pageSize: number;

    /** 总页数 */
    totalPages: number;
}

/**
 * 字段排除类型工具
 *
 * 将指定的字段设置为可选，其他字段保持不变
 */
export type ExcludeFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 嵌套字段路径类型
 * 支持 "field" 和 "relation.field" 格式
 */
export type NestedFieldPath<T> = {
    [K in keyof T]: T[K] extends object
        ? K extends string
            ? `${K}` | `${K}.${string}`
            : never
        : K extends string
          ? `${K}`
          : never;
}[keyof T];

/**
 * 字段路径类型，支持顶层字段和嵌套字段路径
 */
export type FieldPath<T> = keyof T | NestedFieldPath<T> | string;

/**
 * 根据 excludeFields 数组推断结果类型
 *
 * 如果 excludeFields 为空或未定义，返回完整的 T 类型
 * 否则返回处理后的类型（注意：嵌套字段排除的类型推断较复杂，这里简化处理）
 */
export type ExcludeFieldsResult<
    T,
    E extends readonly FieldPath<T>[] | undefined,
> = E extends undefined ? T : E extends readonly [] ? T : T; // 简化处理，实际运行时会正确排除字段

export interface FieldFilterOptions<T> extends Omit<FindManyOptions<T>, "lock"> {
    /** 要排除的字段，支持嵌套字段路径如 "user.password" */
    excludeFields?: readonly FieldPath<T>[];
    /** 要包含的字段，支持嵌套字段路径如 "user.name"，与 excludeFields 互斥 */
    includeFields?: readonly FieldPath<T>[];
    /** 事务管理器 */
    entityManager?: EntityManager;
    /** 锁配置 */
    lock?: LockOptions;
}

/**
 * DRY基础服务类
 *
 * 提供通用的CRUD操作和分页查询功能，可被其他服务继承使用
 * 泛型参数T代表实体类型，需要包含id属性
 * 针对PostgreSQL数据库进行了优化
 */
export class BaseService<T extends { id: string }> {
    @Inject(DataSource)
    protected readonly dataSource: DataSource;

    /** 日志记录器 */
    protected readonly logger: Logger;

    /**
     * 构造函数
     *
     * @param repository 实体仓库，用于数据库操作
     * @param dataSource 数据源，用于创建事务
     */
    constructor(protected readonly repository: Repository<T>) {
        // 自动获取子类的类名作为日志上下文
        const serviceName = this.constructor.name;
        this.logger = new Logger(serviceName);
    }

    /**
     * 使用PostgreSQL的ILike操作符进行不区分大小写的模糊搜索
     * @param field 字段名
     * @param value 搜索值
     * @returns 查询条件
     */
    protected ilike(field: keyof T, value: string): FindOptionsWhere<T> {
        const condition: Record<string, any> = {};
        condition[field as string] = ILike(`%${value}%`);
        return condition as FindOptionsWhere<T>;
    }

    /**
     * 使用PostgreSQL的全文搜索功能
     * @param field 字段名
     * @param value 搜索值
     * @returns 查询条件
     */
    protected textSearch(field: keyof T, value: string): FindOptionsWhere<T> {
        const condition: Record<string, any> = {};
        condition[field as string] = Raw(
            (alias) => `to_tsvector('simple', ${alias}) @@ to_tsquery('simple', :query)`,
            { query: value.split(" ").join(" & ") },
        );
        return condition as FindOptionsWhere<T>;
    }

    /**
     * 使用PostgreSQL的JSON查询功能
     * @param jsonField JSON字段名
     * @param path JSON路径
     * @param value 查询值
     * @returns 查询条件
     */
    protected jsonQuery(jsonField: keyof T, path: string, value: any): FindOptionsWhere<T> {
        const condition: Record<string, any> = {};
        condition[jsonField as string] = Raw((alias) => `${alias}->>'${path}' = :value`, {
            value: typeof value === "string" ? value : JSON.stringify(value),
        });
        return condition as FindOptionsWhere<T>;
    }

    /**
     * 使用PostgreSQL的数组包含查询
     * @param field 数组字段名
     * @param value 查询值
     * @returns 查询条件
     */
    protected arrayContains(field: keyof T, value: any): FindOptionsWhere<T> {
        const condition: Record<string, any> = {};
        condition[field as string] = Raw((alias) => `${alias} @> ARRAY[:...values]`, {
            values: Array.isArray(value) ? value : [value],
        });
        return condition as FindOptionsWhere<T>;
    }

    /**
     * 构建分页返回结果
     *
     * @param data 列表数据
     * @param total 总记录数
     * @param paginationDto 分页参数
     * @returns 标准分页结果对象
     */
    protected paginationResult<U>(
        data: U[],
        total: number,
        paginationDto: PaginationDto,
    ): PaginationResult<U> {
        const totalPages = Math.ceil(total / paginationDto.pageSize);
        return {
            items: data,
            total,
            page: paginationDto.page,
            pageSize: paginationDto.pageSize,
            totalPages,
        };
    }

    /**
     * 分页查询（支持锁）
     *
     * @param paginationDto 分页参数，包含页码和每页条数
     * @param options 查询选项，可包含条件、排序、关联等
     * @returns 分页结果，包含数据列表和分页信息
     */
    async paginate<E extends readonly FieldPath<T>[] | undefined = undefined>(
        paginationDto: PaginationDto,
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<PaginationResult<ExcludeFieldsResult<T, E>>> {
        const { page, pageSize } = paginationDto;
        const {
            excludeFields = [],
            includeFields,
            entityManager,
            lock,
            ...findOptions
        } = options || {};

        // 使用事务管理器或仓库查询实体
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        // 构建查询选项并应用锁配置
        const paginationOptions: FindManyOptions<T> = {
            ...findOptions,
            skip: (page - 1) * pageSize,
            take: pageSize,
        };

        const lockedPaginationOptions = this.applyLockToFindOptions(paginationOptions, lock);
        const [data, total] = await repo.findAndCount(lockedPaginationOptions);

        const processedData = this.applyFieldFilter(
            data,
            excludeFields,
            includeFields,
        ) as ExcludeFieldsResult<T, E>[];

        return this.paginationResult(processedData, total, paginationDto);
    }

    /**
     * 高级分页查询，适用于高级&复杂的查询方法（支持锁）
     *
     * @param queryBuilder 查询构造器
     * @param paginationDto 分页参数，包含页码和每页条数
     * @param excludeFields 要排除的字段数组
     * @param includeFields 要包含的字段数组
     * @param lockOptions 锁配置
     * @returns 分页结果，包含数据列表和分页信息
     */
    async paginateQueryBuilder(
        queryBuilder: SelectQueryBuilder<T>,
        paginationDto: PaginationDto,
        excludeFields: string[] = [],
        includeFields?: string[],
        lockOptions?: LockOptions,
    ): Promise<PaginationResult<T>> {
        const { page, pageSize } = paginationDto;

        // 应用锁配置到查询构造器
        if (lockOptions && lockOptions.type !== LockType.OPTIMISTIC) {
            const lockMode = this.getLockMode(lockOptions.type) as any;
            queryBuilder.setLock(lockMode);
        }

        const [data, total] = await queryBuilder
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        // 处理字段过滤
        const processedData = this.applyFieldFilter(data, excludeFields, includeFields) as T[];
        return this.paginationResult(processedData, total, paginationDto);
    }

    /**
     * 创建事务
     * @param isolationLevel 事务隔离级别（PostgreSQL特有）
     * @returns 查询运行器
     */
    protected async createTransaction(
        isolationLevel?: "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE",
    ): Promise<QueryRunner> {
        if (!this.dataSource) {
            throw new Error(
                "DataSource is not available. Make sure to inject it in the service constructor.",
            );
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        if (isolationLevel) {
            await queryRunner.startTransaction(isolationLevel);
        } else {
            // 默认使用 READ COMMITTED 隔离级别，这是PostgreSQL的默认级别
            await queryRunner.startTransaction("READ COMMITTED");
        }

        return queryRunner;
    }

    /**
     * 在事务中执行操作
     * @param callback 事务回调函数
     * @param isolationLevel 事务隔离级别（PostgreSQL特有）
     * @returns 回调函数的返回值
     */
    protected async withTransaction<R>(
        callback: (entityManager: EntityManager) => Promise<R>,
        isolationLevel?: "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE",
    ): Promise<R> {
        const queryRunner = await this.createTransaction(isolationLevel);

        try {
            const result = await callback(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * 带重试机制的操作执行
     * @param operation 要执行的操作
     * @param lockOptions 锁配置
     * @returns 操作结果
     */
    protected async withRetry<R>(
        operation: () => Promise<R>,
        lockOptions?: LockOptions,
    ): Promise<R> {
        const maxRetries = lockOptions?.retryCount ?? 3;
        const retryDelay = lockOptions?.retryDelay ?? 100;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (this.isRetryableError(error) && attempt < maxRetries) {
                    this.logger.warn(
                        `操作失败，第 ${attempt + 1} 次重试，错误: ${(error as Error).message}`,
                    );
                    await this.sleep(retryDelay * Math.pow(2, attempt)); // 指数退避
                    continue;
                }

                throw error;
            }
        }

        // 这里加一个兜底
        throw lastError ?? new Error("未知错误");
    }

    /**
     * 检查错误是否可重试
     * @param error 错误对象
     * @returns 是否可重试
     */
    private isRetryableError(error: any): boolean {
        // 乐观锁版本冲突
        if (error instanceof OptimisticLockVersionMismatchError) {
            return true;
        }

        // PostgreSQL 锁超时或死锁
        if (error.code === "40001" || error.code === "40P01") {
            return true;
        }

        // 连接错误
        if (error.code === "ECONNRESET" || error.code === "ENOTFOUND") {
            return true;
        }

        return false;
    }

    /**
     * 延迟执行
     * @param ms 延迟毫秒数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 应用锁配置到查询选项
     * @param options 查询选项
     * @param lockOptions 锁配置
     * @returns 应用锁后的查询选项
     */
    protected applyLockToFindOptions<T>(
        options: FindManyOptions<T>,
        lockOptions?: LockOptions,
    ): FindManyOptions<T> {
        if (!lockOptions || lockOptions.type === LockType.OPTIMISTIC) {
            return options;
        }

        const lockConfig: any = {
            mode: this.getLockMode(lockOptions.type),
        };

        if (lockOptions.timeout) {
            lockConfig.timeout = lockOptions.timeout;
        }

        return {
            ...options,
            lock: lockConfig,
        };
    }

    /**
     * 获取 TypeORM 锁模式
     * @param lockType 锁类型
     * @returns TypeORM 锁模式
     */
    private getLockMode(lockType: LockType): string {
        switch (lockType) {
            case LockType.PESSIMISTIC_READ:
                return "pessimistic_read";
            case LockType.PESSIMISTIC_WRITE:
                return "pessimistic_write";
            case LockType.PESSIMISTIC_PARTIAL_WRITE:
                return "pessimistic_partial_write";
            case LockType.PESSIMISTIC_WRITE_OR_FAIL:
                return "pessimistic_write_or_fail";
            default:
                return "pessimistic_write";
        }
    }

    /**
     * 检查实体是否支持乐观锁
     * @param entity 实体对象
     * @param versionField 版本字段名
     * @returns 是否支持乐观锁
     */
    protected hasOptimisticLock(entity: any, versionField: string = "version"): boolean {
        return entity && typeof entity[versionField] !== "undefined";
    }

    /**
     * 创建记录
     * @param dto 创建数据
     * @param options 选项配置
     * @returns 创建的实体
     */
    async create<E extends readonly FieldPath<T>[] | undefined = undefined>(
        dto: DeepPartial<T>,
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E>> {
        const { entityManager, excludeFields = [], includeFields, lock } = options || {};

        const operation = async () => {
            const entity = this.repository.create(dto);

            // 使用事务管理器或仓库保存实体
            const repo = entityManager
                ? entityManager.getRepository(this.repository.target)
                : this.repository;
            const saved = await repo.save(entity);

            return this.applyFieldFilter(
                saved,
                excludeFields,
                includeFields,
            ) as ExcludeFieldsResult<T, E>;
        };

        try {
            return await this.withRetry(operation, lock);
        } catch (error) {
            this.logger.error(`创建记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Create failed.");
        }
    }

    /**
     * 批量创建记录
     *
     * 使用事务来提高PostgreSQL的批量插入性能
     *
     * @param dtos 创建实体的数据传输对象数组
     * @returns 创建成功的实体对象数组
     */
    async createMany<E extends readonly FieldPath<T>[] | undefined = undefined>(
        dtos: DeepPartial<T>[],
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E>[]> {
        if (!dtos.length) return [];

        const { excludeFields = [], includeFields } = options || {};

        // 使用事务来提高PostgreSQL的批量插入性能
        try {
            return await this.withTransaction(async (manager) => {
                const repo = manager.getRepository(this.repository.target);
                const entities = this.repository.create(dtos);

                // 使用单个查询批量插入，PostgreSQL会自动优化
                const saved = await repo.save(entities);

                return this.applyFieldFilter(
                    saved,
                    excludeFields,
                    includeFields,
                ) as ExcludeFieldsResult<T, E>[];
            });
        } catch (error) {
            this.logger.error(`批量创建记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Batch create failed.");
        }
    }

    /**
     * 根据ID更新记录（支持乐观锁和悲观锁）
     *
     * @param id 记录ID
     * @param dto 更新的数据传输对象
     * @param options 选项配置
     * @returns 更新后的实体对象
     * @throws NotFoundException 当记录不存在时抛出
     */
    async updateById<E extends readonly FieldPath<T>[] | undefined = undefined>(
        id: string,
        dto: DeepPartial<T>,
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E>> {
        const { excludeFields = [], includeFields, lock } = options || {};

        const operation = async () => {
            return await this.withTransaction(async (manager) => {
                const repo = manager.getRepository(this.repository.target);

                // 构建查询选项，应用锁配置
                const findOptions: FindManyOptions<T> = {
                    where: { id } as FindOptionsWhere<T>,
                };

                const lockedFindOptions = this.applyLockToFindOptions(findOptions, lock);
                const entity = await repo.findOne(lockedFindOptions);

                if (!entity) {
                    throw HttpErrorFactory.notFound(`No such record.`);
                }

                // 乐观锁版本检查
                if (lock?.type === LockType.OPTIMISTIC) {
                    const versionField = lock.versionField || "version";
                    if (
                        this.hasOptimisticLock(entity, versionField) &&
                        this.hasOptimisticLock(dto, versionField)
                    ) {
                        if ((entity as any)[versionField] !== (dto as any)[versionField]) {
                            throw new OptimisticLockVersionMismatchError(
                                this.repository.target as any,
                                (entity as any)[versionField],
                                (dto as any)[versionField],
                            );
                        }
                    }
                }

                // 合并并保存实体
                const merged = repo.merge(entity as T, dto);
                const saved = await repo.save(merged);

                return this.applyFieldFilter(
                    saved,
                    excludeFields,
                    includeFields,
                ) as ExcludeFieldsResult<T, E>;
            });
        };

        try {
            return await this.withRetry(operation, lock);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof OptimisticLockVersionMismatchError) {
                this.logger.warn(`乐观锁版本冲突: ${error.message}`);
                throw HttpErrorFactory.badRequest(
                    "Record has been modified by another user. Please refresh and try again.",
                );
            }
            this.logger.error(`更新记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Update failed.");
        }
    }

    /**
     * 更新记录
     *
     * @param dto 更新的数据传输对象
     * @param options 更新选项
     * @returns 更新后的实体对象数组
     * @throws NotFoundException 当记录不存在时抛出
     */
    async update<E extends readonly FieldPath<T>[] | undefined = undefined>(
        dto: DeepPartial<T>,
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E> | ExcludeFieldsResult<T, E>[]> {
        // 使用事务管理器或仓库查询实体
        const { entityManager, excludeFields = [], includeFields } = options || {};
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        // 查询实体
        const findOptions = { ...options };
        delete findOptions.entityManager;

        try {
            // 查询所有符合条件的实体
            const entities = await this.findAll(findOptions);

            if (entities.length === 0) {
                throw HttpErrorFactory.notFound("No records found with given criteria.");
            }

            // 合并并保存所有实体
            const mergedEntities = entities.map((entity) => repo.merge(entity as T, dto));
            const savedEntities = await repo.save(mergedEntities);

            // 应用字段过滤
            const result = savedEntities.map((entity) =>
                this.applyFieldFilter(entity, excludeFields, includeFields),
            ) as ExcludeFieldsResult<T, E>[];

            if (result.length === 1) {
                return result[0];
            }
            return result;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`更新记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Update failed.");
        }
    }

    /**
     * 根据ID获取单条记录详情（支持锁）
     *
     * @param id 记录ID
     * @param options 选项配置
     * @returns 查询到的实体对象，如不存在则返回null
     */
    async findOneById<E extends readonly FieldPath<T>[] | undefined = undefined>(
        id: string,
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E> | null> {
        if (!id) {
            return null;
        }
        const {
            excludeFields = [],
            includeFields,
            where = {},
            entityManager,
            lock,
            ...restOptions
        } = options || {};

        // 使用事务管理器或仓库查询实体
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        // 构建查询条件
        const whereCondition = { ...where } as FindOptionsWhere<T>;
        whereCondition.id = id as any;

        // 构建查询选项并应用锁配置
        const findOptions: FindManyOptions<T> = {
            ...restOptions,
            where: whereCondition,
        };

        const lockedFindOptions = this.applyLockToFindOptions(findOptions, lock);
        const entity = await repo.findOne(lockedFindOptions);

        if (!entity) {
            return null;
        }

        return this.applyFieldFilter(entity, excludeFields, includeFields) as ExcludeFieldsResult<
            T,
            E
        >;
    }

    /**
     * 根据条件查询单条记录（支持锁）
     *
     * @param options 查询选项
     * @returns 查询到的实体对象，如不存在则返回null
     */
    async findOne<E extends readonly FieldPath<T>[] | undefined = undefined>(
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E> | null> {
        const {
            excludeFields = [],
            includeFields,
            where = {},
            entityManager,
            lock,
            ...restOptions
        } = options || {};

        // 使用事务管理器或仓库查询实体
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        // 构建查询选项并应用锁配置
        const findOptions: FindManyOptions<T> = {
            ...restOptions,
            where: Array.isArray(where) ? where : { ...where },
        };

        const lockedFindOptions = this.applyLockToFindOptions(findOptions, lock);
        const entity = await repo.findOne(lockedFindOptions);

        if (!entity) {
            return null;
        }

        return this.applyFieldFilter(entity, excludeFields, includeFields) as ExcludeFieldsResult<
            T,
            E
        >;
    }

    /**
     * 删除记录
     *
     * 如果实体配置了软删除(@DeleteDateColumn)，则执行软删除
     * 否则执行物理删除
     *
     * @param id 记录ID
     * @throws NotFoundException 当记录不存在时抛出
     */
    async delete(id: string, options?: FieldFilterOptions<T>): Promise<void> {
        const { entityManager } = options || {};

        // 使用事务管理器或仓库查询实体
        const findOptions = { ...options };
        const entity = (await this.findOneById(id, findOptions)) as T;

        if (!entity) {
            throw HttpErrorFactory.notFound("Record with given criteria not found.");
        }

        // 使用事务管理器或仓库删除实体
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;
        const metadata = repo.metadata;

        try {
            if (metadata.deleteDateColumn) {
                await repo.softRemove(entity);
            } else {
                await repo.remove(entity);
            }
        } catch (error) {
            this.logger.error(`删除记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Delete failed.");
        }
    }

    /**
     * 批量删除记录
     *
     * 如果实体配置了软删除(@DeleteDateColumn)，则执行软删除
     * 否则执行物理删除
     *
     * @param ids 记录ID数组（UUID格式）
     * @returns 删除的记录数量
     */
    async deleteMany(
        ids: string[],
        options?: FieldFilterOptions<T> & { strict?: boolean },
    ): Promise<number> {
        if (!Array.isArray(ids) || ids.length === 0) {
            return 0;
        }

        const { entityManager, strict = false } = options || {};

        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        const metadata = repo.metadata;

        let entities: T[];
        try {
            entities = await repo.findBy({
                id: In(ids),
            } as FindOptionsWhere<T>);
        } catch (error) {
            this.logger.error(`查询待删除记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to query records for deletion.");
        }

        if (entities.length === 0) {
            if (strict) {
                throw HttpErrorFactory.badRequest("All records not found.");
            }
            return 0;
        }

        if (strict && entities.length < ids.length) {
            const foundIds = entities.map((e: any) => e.id);
            const missingIds = ids.filter((id) => !foundIds.includes(id));
            this.logger.warn(`部分 ID 未找到: ${missingIds.join(", ")}`);
            throw HttpErrorFactory.badRequest(`Some records not found: ${missingIds.join(", ")}`);
        }

        try {
            const result = metadata.deleteDateColumn
                ? await repo.softRemove(entities)
                : await repo.remove(entities);
            return result.length;
        } catch (error) {
            this.logger.error(`批量删除记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Batch delete failed.");
        }
    }

    /**
     * 恢复软删除的数据
     *
     * @param id 记录ID
     * @throws BadRequestException 当实体不支持软删除时抛出
     */
    async restore(id: string, options?: FieldFilterOptions<T>): Promise<void> {
        const { entityManager } = options || {};

        // 使用事务管理器或仓库
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;
        const metadata = repo.metadata;

        if (!metadata.deleteDateColumn) {
            throw HttpErrorFactory.badRequest("This entity does not support soft delete.");
        }

        try {
            await repo.restore(id);
        } catch (error) {
            this.logger.error(`恢复记录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Restore failed.");
        }
    }

    /**
     * 查询所有记录（支持锁）
     *
     * @param options 查询选项，可包含条件、排序、关联等
     * @returns 查询到的实体对象数组
     */
    async findAll<E extends readonly FieldPath<T>[] | undefined = undefined>(
        options?: FieldFilterOptions<T> & { excludeFields?: E },
    ): Promise<ExcludeFieldsResult<T, E>[]> {
        const {
            excludeFields = [],
            includeFields,
            entityManager,
            lock,
            ...restOptions
        } = options || {};

        // 使用事务管理器或仓库查询实体
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        // 构建查询选项并应用锁配置
        const findOptions: FindManyOptions<T> = restOptions;
        const lockedFindOptions = this.applyLockToFindOptions(findOptions, lock);
        const entities = await repo.find(lockedFindOptions);

        // 类型断言确保返回类型是数组
        return this.applyFieldFilter(entities, excludeFields, includeFields) as ExcludeFieldsResult<
            T,
            E
        >[];
    }

    /**
     * 查询记录总数量
     *
     * @param options 查询选项，可包含条件等（不包含排序、分页等）
     * @returns 符合条件的记录总数
     */
    async count(options?: FieldFilterOptions<T>): Promise<number> {
        const { entityManager, lock: _lock, ...restOptions } = options || {};

        // 使用事务管理器或仓库查询实体
        const repo = entityManager
            ? entityManager.getRepository(this.repository.target)
            : this.repository;

        try {
            // count 操作通常不需要锁，但为了一致性保留接口
            return await repo.count(restOptions);
        } catch (error) {
            this.logger.error(`查询记录数量失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Count query failed.");
        }
    }

    /**
     * 排除字段
     *
     * @param data 数据
     * @param excludeFields 要排除的字段数组，支持嵌套字段路径如 "user.password"
     * @returns 排除字段后的数据
     */
    private excludeField = (data: T[] | T, excludeFields: readonly FieldPath<T>[]): any => {
        if (excludeFields.length === 0 || !data) return data;

        const deepDelete = (obj: any, path: string) => {
            const keys = path.split(".");
            const lastKey = keys.pop();

            let current = obj;
            for (const key of keys) {
                if (!current || typeof current !== "object") return;
                current = current[key];
            }

            if (current && typeof current === "object" && lastKey) {
                delete current[lastKey];
            }
        };

        const removeFields = (item: T): any => {
            const clone = { ...item };

            for (const field of excludeFields) {
                const fieldStr = String(field);
                if (fieldStr.includes(".")) {
                    deepDelete(clone, fieldStr);
                } else {
                    delete clone[field as keyof T];
                }
            }

            return clone;
        };

        if (isArray(data)) {
            return data.map((item) => removeFields(item));
        } else {
            return removeFields(data);
        }
    };

    /**
     * 包含字段（只保留指定字段）
     *
     * @param data 数据
     * @param includeFields 要包含的字段数组，支持嵌套字段路径如 "user.name"
     * @returns 只包含指定字段的数据
     *
     * 智能处理逻辑:
     * - 如果只指定了嵌套字段(如 "author.id", "author.name"),则保留所有顶层字段,只过滤嵌套对象
     * - 如果指定了顶层字段,则只保留指定的顶层字段
     * - 如果混合了顶层和嵌套字段,则按指定处理
     */
    private includeField = (data: T[] | T, includeFields: readonly FieldPath<T>[]): any => {
        if (includeFields.length === 0 || !data) return data;

        const deepGet = (obj: any, path: string): any => {
            const keys = path.split(".");
            let current = obj;
            for (const key of keys) {
                if (!current || typeof current !== "object") return undefined;
                current = current[key];
            }
            return current;
        };

        const deepSet = (obj: any, path: string, value: any) => {
            const keys = path.split(".");
            const lastKey = keys.pop();
            if (!lastKey) return;

            let current = obj;
            for (const key of keys) {
                if (!current[key]) {
                    current[key] = {};
                }
                current = current[key];
            }
            current[lastKey] = value;
        };

        const pickFields = (item: T): any => {
            // 分析 includeFields,区分顶层字段和嵌套字段
            const topLevelFields = new Set<string>();
            const nestedFieldsMap = new Map<string, string[]>(); // key: 顶层字段, value: 嵌套字段路径

            for (const field of includeFields) {
                const fieldStr = String(field);
                if (fieldStr.includes(".")) {
                    const [topLevel, ...rest] = fieldStr.split(".");
                    if (!nestedFieldsMap.has(topLevel)) {
                        nestedFieldsMap.set(topLevel, []);
                    }
                    nestedFieldsMap.get(topLevel)!.push(rest.join("."));
                } else {
                    topLevelFields.add(fieldStr);
                }
            }

            // 如果只指定了嵌套字段,保留所有顶层字段
            const onlyNestedFields = topLevelFields.size === 0 && nestedFieldsMap.size > 0;

            const result: any = {};

            if (onlyNestedFields) {
                // 保留所有顶层字段
                Object.assign(result, item);

                // 只过滤嵌套对象
                for (const [topLevel, nestedPaths] of nestedFieldsMap.entries()) {
                    const nestedObj = (item as any)[topLevel];
                    if (nestedObj && typeof nestedObj === "object") {
                        const filteredNested: any = {};
                        for (const path of nestedPaths) {
                            const value = deepGet(nestedObj, path);
                            if (value !== undefined) {
                                if (path.includes(".")) {
                                    deepSet(filteredNested, path, value);
                                } else {
                                    filteredNested[path] = value;
                                }
                            }
                        }
                        result[topLevel] = filteredNested;
                    }
                }
            } else {
                // 按指定的字段处理
                for (const field of includeFields) {
                    const fieldStr = String(field);
                    const value = deepGet(item, fieldStr);

                    if (value !== undefined) {
                        if (fieldStr.includes(".")) {
                            deepSet(result, fieldStr, value);
                        } else {
                            result[field as keyof T] = value;
                        }
                    }
                }
            }

            return result;
        };

        if (isArray(data)) {
            return data.map((item) => pickFields(item));
        } else {
            return pickFields(data);
        }
    };

    /**
     * 验证字段过滤选项
     *
     * @param excludeFields 排除字段
     * @param includeFields 包含字段
     * @throws Error 当同时使用 excludeFields 和 includeFields 时抛出
     */
    private validateFieldFilterOptions(
        excludeFields?: readonly FieldPath<T>[],
        includeFields?: readonly FieldPath<T>[],
    ): void {
        if (
            excludeFields &&
            excludeFields.length > 0 &&
            includeFields &&
            includeFields.length > 0
        ) {
            throw HttpErrorFactory.badRequest(
                "Cannot use both excludeFields and includeFields at the same time.",
            );
        }
    }

    /**
     * 应用字段过滤
     *
     * @param data 数据
     * @param excludeFields 排除字段
     * @param includeFields 包含字段
     * @returns 过滤后的数据
     */
    private applyFieldFilter(
        data: T[] | T,
        excludeFields?: readonly FieldPath<T>[],
        includeFields?: readonly FieldPath<T>[],
    ): any {
        this.validateFieldFilterOptions(excludeFields, includeFields);

        if (includeFields && includeFields.length > 0) {
            return this.includeField(data, includeFields);
        }

        if (excludeFields && excludeFields.length > 0) {
            return this.excludeField(data, excludeFields);
        }

        return data;
    }
}
