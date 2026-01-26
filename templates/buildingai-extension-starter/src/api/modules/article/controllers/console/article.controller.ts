import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

import { Article } from "../../../../db/entities/article.entity";
import { CreateArticleDto, QueryArticleDto, UpdateArticleDto } from "../../dto";
import { ArticleService } from "../../services/article.service";

/**
 * Article management controller (console)
 */
@ExtensionConsoleController("article", "Blog Article Management")
export class ArticleController extends BaseController {
    /**
     * Constructor
     *
     * @param articleService Article service
     */
    constructor(private readonly articleService: ArticleService) {
        super();
    }

    /**
     * Create an article
     *
     * @param createArticleDto DTO for creating an article
     * @returns Created article
     */
    @Post()
    async create(
        @Body() createArticleDto: CreateArticleDto,
        @Playground() user: UserPlayground,
    ): Promise<Partial<Article>> {
        return this.articleService.createArticle(createArticleDto, user.id);
    }

    /**
     * Query article list
     *
     * @param queryArticleDto DTO for querying articles
     * @returns Article list
     */
    @Get()
    async findAll(@Query() queryArticleDto: QueryArticleDto) {
        return this.articleService.list(queryArticleDto);
    }

    /**
     * Get article by id
     *
     * @param id Article id
     * @returns Article detail
     */
    @Get(":id")
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        return this.articleService.findOneById(id);
    }

    /**
     * Update article
     *
     * @param id Article id
     * @param updateArticleDto DTO for updating an article
     * @returns Updated article
     */
    @Put(":id")
    async update(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() updateArticleDto: UpdateArticleDto,
    ) {
        return this.articleService.updateArticleById(id, updateArticleDto);
    }

    /**
     * Delete article
     *
     * @param id Article id
     * @returns Operation result
     */
    @Delete(":id")
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        const article = await this.articleService.findOneById(id);

        if (!article) {
            return {
                success: false,
                message: "Article does not exist",
            };
        }

        await this.articleService.delete(id);
        return {
            success: true,
            message: "Deleted successfully",
        };
    }

    /**
     * Batch delete articles
     *
     * @param ids Article ids
     * @returns Operation result
     */
    @Post("batch-delete")
    async batchRemove(@Body("ids") ids: string[]) {
        try {
            await this.articleService.batchDelete(ids);
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

    /**
     * Publish article
     *
     * @param id Article id
     * @returns Operation result
     */
    @Post(":id/publish")
    async publish(@Param("id", UUIDValidationPipe) id: string) {
        try {
            await this.articleService.publish(id);
            return {
                success: true,
                message: "Published successfully",
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    /**
     * Unpublish article
     *
     * @param id Article id
     * @returns Operation result
     */
    @Post(":id/unpublish")
    async unpublish(@Param("id", UUIDValidationPipe) id: string) {
        try {
            await this.articleService.unpublish(id);
            return {
                success: true,
                message: "Unpublished successfully",
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}
