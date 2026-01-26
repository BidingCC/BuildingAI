import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

import { Category } from "../../../../db/entities/category.entity";
import { CreateCategoryDto, QueryCategoryDto, UpdateCategoryDto } from "../../dto";
import { CategoryService } from "../../services/category.service";

/**
 * Category management controller (console)
 */
@ExtensionConsoleController("category", "Blog Category Management")
export class CategoryController extends BaseController {
    /**
     * Constructor
     *
     * @param categoryService Category service
     */
    constructor(private readonly categoryService: CategoryService) {
        super();
    }

    /**
     * Create a category
     *
     * @param createCategoryDto DTO for creating a category
     * @returns Created category
     */
    @Post()
    async create(@Body() createCategoryDto: CreateCategoryDto): Promise<Partial<Category>> {
        return this.categoryService.createCategory(createCategoryDto);
    }

    /**
     * Query category list
     *
     * @param queryCategoryDto DTO for querying categories
     * @returns Category list
     */
    @Get()
    async findAll(@Query() queryCategoryDto: QueryCategoryDto): Promise<Category[]> {
        return this.categoryService.list(queryCategoryDto);
    }

    /**
     * Get category by id
     *
     * @param id Category id
     * @returns Category detail
     */
    @Get(":id")
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        return this.categoryService.findOneById(id);
    }

    /**
     * Update category
     *
     * @param id Category id
     * @param updateCategoryDto DTO for updating a category
     * @returns Updated category
     */
    @Put(":id")
    async update(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        return this.categoryService.updateCategoryById(id, updateCategoryDto);
    }

    /**
     * Delete category
     *
     * @param id Category id
     * @returns Operation result
     */
    @Delete(":id")
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        // Ensure not used
        const category = await this.categoryService.findOneById(id);

        if (!category) {
            return {
                success: false,
                message: "Category does not exist",
            };
        }

        if (category.articleCount > 0) {
            return {
                success: false,
                message: "This category is in use and cannot be deleted",
            };
        }

        await this.categoryService.delete(id);
        return {
            success: true,
            message: "Deleted successfully",
        };
    }

    /**
     * Batch delete categories
     *
     * @param ids Category ids
     * @returns Operation result
     */
    @Post("batch-delete")
    async batchRemove(@Body("ids") ids: string[]) {
        try {
            await this.categoryService.batchDelete(ids);
            return {
                success: true,
                message: "Batch deletion succeeded",
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}
