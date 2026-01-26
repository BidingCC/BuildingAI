import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import type { FindOptionsWhere } from "@buildingai/db/typeorm";
import { In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { Category } from "../../../db/entities/category.entity";
import { CreateCategoryDto, QueryCategoryDto, UpdateCategoryDto } from "../dto";

@Injectable()
export class CategoryService extends BaseService<Category> {
    /**
     * Constructor
     */
    constructor(
        @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    ) {
        super(categoryRepository);
    }

    /**
     * Create a category
     *
     * @param createCategoryDto DTO for creating a category
     * @returns Created category
     */
    async createCategory(createCategoryDto: CreateCategoryDto): Promise<Partial<Category>> {
        // Ensure unique name
        const existingCategory = await this.categoryRepository.findOne({
            where: {
                name: createCategoryDto.name,
            },
        });

        if (existingCategory) {
            throw HttpErrorFactory.badRequest("A category with the same name already exists");
        }

        // Set default sort
        const categoryData = {
            ...createCategoryDto,
            sort: createCategoryDto.sort ?? 0,
        };

        return super.create(categoryData);
    }

    /**
     * Query category list
     *
     * @param queryCategoryDto DTO for querying categories
     * @returns Category list
     */
    async list(queryCategoryDto: QueryCategoryDto): Promise<Category[]> {
        const { name } = queryCategoryDto;

        // Build where conditions
        const where: FindOptionsWhere<Category> = {};

        if (name) {
            where.name = Like(`%${name}%`);
        }

        // Query category list
        return this.categoryRepository.find({
            where,
            order: { sort: "DESC", createdAt: "DESC" },
        });
    }

    /**
     * Update a category by id
     *
     * @param id Category id
     * @param updateCategoryDto DTO for updating a category
     * @returns Updated category
     */
    async updateCategoryById(
        id: string,
        updateCategoryDto: UpdateCategoryDto,
    ): Promise<Partial<Category>> {
        // Ensure category exists
        const category = await this.categoryRepository.findOne({
            where: { id },
        });

        if (!category) {
            throw HttpErrorFactory.notFound(`Category ${id} does not exist`);
        }

        // If name changes, ensure uniqueness constraint
        if (updateCategoryDto.name) {
            const existingCategory = await this.categoryRepository.findOne({
                where: {
                    name: updateCategoryDto.name,
                },
            });

            if (existingCategory && existingCategory.id !== id) {
                throw HttpErrorFactory.badRequest("A category with the same name already exists");
            }
        }

        // Update category
        return super.updateById(id, updateCategoryDto);
    }

    /**
     * Increment category article count
     *
     * @param id Category id
     * @param count Increment value, default 1
     */
    async incrementArticleCount(id: string, count: number = 1): Promise<void> {
        const category = await this.categoryRepository.findOne({
            where: { id },
        });

        if (!category) {
            throw HttpErrorFactory.notFound(`Category ${id} does not exist`);
        }

        category.incrementArticleCount(count);
        await this.categoryRepository.save(category);
    }

    /**
     * Decrement category article count
     *
     * @param id Category id
     * @param count Decrement value, default 1
     */
    async decrementArticleCount(id: string, count: number = 1): Promise<void> {
        const category = await this.categoryRepository.findOne({
            where: { id },
        });

        if (!category) {
            throw HttpErrorFactory.notFound(`Category ${id} does not exist`);
        }

        category.decrementArticleCount(count);
        await this.categoryRepository.save(category);
    }

    /**
     * Batch delete categories
     *
     * @param ids Category ids
     * @returns void
     */
    async batchDelete(ids: string[]): Promise<void> {
        // Ensure not used (articleCount > 0)
        const categories = await this.categoryRepository.find({
            where: { id: In(ids) },
        });

        const usedCategories = categories.filter((category) => category.hasArticles());

        if (usedCategories.length > 0) {
            throw HttpErrorFactory.badRequest(
                `Cannot delete, the following categories are in use: ${usedCategories
                    .map((c) => c.name)
                    .join(", ")}`,
            );
        }

        // Delete in batch
        await this.deleteMany(ids);
    }
}
