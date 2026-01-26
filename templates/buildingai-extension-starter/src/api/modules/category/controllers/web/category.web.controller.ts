import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Get, Param, Query } from "@nestjs/common";

import { Category } from "../../../../db/entities/category.entity";
import { QueryCategoryDto } from "../../dto";
import { CategoryService } from "../../services/category.service";

/**
 * Category management controller (web)
 */
@ExtensionWebController("category")
export class CategoryWebController extends BaseController {
    /**
     * Constructor
     *
     * @param categoryService Category service
     */
    constructor(private readonly categoryService: CategoryService) {
        super();
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
}
