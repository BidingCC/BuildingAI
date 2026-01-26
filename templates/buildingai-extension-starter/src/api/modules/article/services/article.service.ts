import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import type { FindOptionsWhere } from "@buildingai/db/typeorm";
import { In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { PublicUserService } from "@buildingai/extension-sdk";
import { buildWhere } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";

import { Article, ArticleStatus } from "../../../db/entities/article.entity";
import { CategoryService } from "../../category/services/category.service";
import { CreateArticleDto, QueryArticleDto, UpdateArticleDto } from "../dto";
@Injectable()
export class ArticleService extends BaseService<Article> {
    /**
     * Constructor
     */
    constructor(
        @InjectRepository(Article) private readonly articleRepository: Repository<Article>,
        private readonly categoryService: CategoryService,
        private readonly userService: PublicUserService,
    ) {
        super(articleRepository);
    }

    /**
     * Format author info, return anonymous if author is null
     *
     * @param article Article entity
     * @returns Article with formatted author
     */
    private formatArticleAuthor<T extends Partial<Article>>(article: T): T {
        if (!article.author) {
            return {
                ...article,
                author: {
                    id: null,
                    nickname: "佚名",
                    avatar: null,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
            };
        }
        return article;
    }

    /**
     * Format author info for article list
     *
     * @param articles Article list
     * @returns Article list with formatted authors
     */
    private formatArticleListAuthors<T extends Partial<Article>>(articles: T[]): T[] {
        return articles.map((article) => this.formatArticleAuthor(article));
    }

    /**
     * Create an article
     *
     * @param createArticleDto DTO for creating an article
     * @returns Created article
     */
    async createArticle(
        createArticleDto: CreateArticleDto,
        authorId: string,
    ): Promise<Partial<Article>> {
        // Validate category if provided
        if (createArticleDto.categoryId) {
            const category = await this.categoryService.findOneById(createArticleDto.categoryId);
            if (!category) {
                throw HttpErrorFactory.badRequest("Category does not exist");
            }
        }

        const author = await this.userService.findUserById(authorId);

        if (!author) {
            throw HttpErrorFactory.notFound("Author not found");
        }

        // Set default values
        const articleData: Partial<Article> = {
            ...createArticleDto,
            status: createArticleDto.status ?? ArticleStatus.DRAFT,
            sort: createArticleDto.sort ?? 0,
            viewCount: 0,
            author,
        };

        // If status is published, set publishedAt
        if (articleData.status === ArticleStatus.PUBLISHED) {
            articleData.publishedAt = new Date();
        }

        const article = await super.create(articleData, {
            includeFields: ["author.id", "author.avatar", "author.nickname"] as const,
        });

        // Increment category article count
        if (createArticleDto.categoryId) {
            await this.categoryService.incrementArticleCount(createArticleDto.categoryId);
        }

        return article;
    }

    /**
     * Query article list
     *
     * @param queryArticleDto DTO for querying articles
     * @returns Article list
     */
    async list(queryArticleDto: QueryArticleDto) {
        const { title, status, categoryId } = queryArticleDto;

        const where = buildWhere<Article>({
            title: title ? Like(`%${title}%`) : undefined,
            status,
            categoryId,
        });

        const result = await this.paginate(queryArticleDto, {
            where,
            relations: ["category", "author"],
            order: { sort: "DESC", createdAt: "DESC" },
            select: {
                author: {
                    id: true,
                    avatar: true,
                    nickname: true,
                },
            },
        });

        // Format authors for all articles
        result.items = this.formatArticleListAuthors(result.items);
        return result;
    }

    /**
     * Get article by id with category relation
     *
     * @param id Article id
     * @returns Article detail
     */
    async findArticleById(id: string): Promise<Article | null> {
        const article = await this.articleRepository.findOne({
            where: { id },
            relations: ["category", "author"],
            select: {
                author: {
                    id: true,
                    avatar: true,
                    nickname: true,
                },
            },
        });

        if (!article) {
            return null;
        }

        return this.formatArticleAuthor(article);
    }

    /**
     * Update an article by id
     *
     * @param id Article id
     * @param updateArticleDto DTO for updating an article
     * @returns Updated article
     */
    async updateArticleById(
        id: string,
        updateArticleDto: UpdateArticleDto,
    ): Promise<Partial<Article>> {
        // Ensure article exists
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw HttpErrorFactory.notFound(`Article ${id} does not exist`);
        }

        const oldCategoryId = article.categoryId;
        const newCategoryId = updateArticleDto.categoryId;

        // Validate new category if provided
        if (newCategoryId && newCategoryId !== oldCategoryId) {
            const category = await this.categoryService.findOneById(newCategoryId);
            if (!category) {
                throw HttpErrorFactory.badRequest("Category does not exist");
            }
        }

        // Handle status change
        const oldStatus = article.status;
        const newStatus = updateArticleDto.status;

        if (newStatus && newStatus !== oldStatus) {
            if (newStatus === ArticleStatus.PUBLISHED && !article.publishedAt) {
                updateArticleDto["publishedAt"] = new Date();
            }
        }

        // Update article
        const updatedArticle = await super.updateById(id, updateArticleDto);

        // Update category article count if category changed
        if (newCategoryId !== undefined && newCategoryId !== oldCategoryId) {
            // Decrement old category count
            if (oldCategoryId) {
                await this.categoryService.decrementArticleCount(oldCategoryId);
            }
            // Increment new category count
            if (newCategoryId) {
                await this.categoryService.incrementArticleCount(newCategoryId);
            }
        }

        return updatedArticle;
    }

    /**
     * Delete article by id
     *
     * @param id Article id
     */
    async delete(id: string): Promise<void> {
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw HttpErrorFactory.notFound(`Article ${id} does not exist`);
        }

        // Decrement category article count
        if (article.categoryId) {
            await this.categoryService.decrementArticleCount(article.categoryId);
        }

        await super.delete(id);
    }

    /**
     * Batch delete articles
     *
     * @param ids Article ids
     * @returns void
     */
    async batchDelete(ids: string[]): Promise<void> {
        const articles = await this.articleRepository.find({
            where: { id: In(ids) },
        });

        // Update category article counts
        const categoryCountMap = new Map<string, number>();
        for (const article of articles) {
            if (article.categoryId) {
                const count = categoryCountMap.get(article.categoryId) || 0;
                categoryCountMap.set(article.categoryId, count + 1);
            }
        }

        // Decrement category counts
        for (const [categoryId, count] of categoryCountMap.entries()) {
            await this.categoryService.decrementArticleCount(categoryId, count);
        }

        // Delete in batch
        await this.deleteMany(ids);
    }

    /**
     * Publish article
     *
     * @param id Article id
     * @returns Updated article
     */
    async publish(id: string): Promise<Partial<Article>> {
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw HttpErrorFactory.notFound(`Article ${id} does not exist`);
        }

        article.publish();
        await this.articleRepository.save(article);

        return article;
    }

    /**
     * Unpublish article (revert to draft)
     *
     * @param id Article id
     * @returns Updated article
     */
    async unpublish(id: string): Promise<Partial<Article>> {
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw HttpErrorFactory.notFound(`Article ${id} does not exist`);
        }

        article.unpublish();
        await this.articleRepository.save(article);

        return article;
    }

    /**
     * Increment article view count
     *
     * @param id Article id
     */
    async incrementViewCount(id: string): Promise<void> {
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw HttpErrorFactory.notFound(`Article ${id} does not exist`);
        }

        article.incrementViewCount();
        await this.articleRepository.save(article);
    }

    /**
     * Get published articles
     *
     * @param categoryId Optional category filter
     * @returns Published article list
     */
    async getPublishedArticles(categoryId?: string): Promise<Article[]> {
        const where: FindOptionsWhere<Article> = {
            status: ArticleStatus.PUBLISHED,
        };

        if (categoryId) {
            where.categoryId = categoryId;
        }

        const articles = await this.articleRepository.find({
            where,
            relations: ["category", "author"],
            order: { publishedAt: "DESC", sort: "DESC" },
            select: {
                author: {
                    id: true,
                    avatar: true,
                    nickname: true,
                },
            },
        });

        return this.formatArticleListAuthors(articles);
    }
}
