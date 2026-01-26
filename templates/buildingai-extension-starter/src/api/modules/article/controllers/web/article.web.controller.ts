import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Get, Param, Query } from "@nestjs/common";

import { Article } from "../../../../db/entities/article.entity";
import { QueryArticleDto } from "../../dto";
import { ArticleService } from "../../services/article.service";

/**
 * Article management controller (web)
 */
@ExtensionWebController("article")
export class ArticleWebController extends BaseController {
    /**
     * Constructor
     *
     * @param articleService Article service
     */
    constructor(private readonly articleService: ArticleService) {
        super();
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
     * Get published articles
     *
     * @param categoryId Optional category filter
     * @returns Published article list
     */
    @Get("published")
    async getPublished(@Query("categoryId") categoryId?: string): Promise<Article[]> {
        return this.articleService.getPublishedArticles(categoryId);
    }

    /**
     * Get article by id
     *
     * @param id Article id
     * @returns Article detail
     */
    @Get(":id")
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        const article = await this.articleService.findOneById(id, {
            relations: ["category", "author"],
            select: {
                author: {
                    id: true,
                    avatar: true,
                    nickname: true,
                },
            },
        });

        if (article) {
            // Increment view count
            await this.articleService.incrementViewCount(id);
        }

        return article;
    }
}
