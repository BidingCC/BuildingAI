'use strict';

var base = require('@buildingai/base');
var typeorm$1 = require('@buildingai/db/@nestjs/typeorm');
var typeorm = require('@buildingai/db/typeorm');
var errors = require('@buildingai/errors');
var extensionSdk = require('@buildingai/extension-sdk');
var utils = require('@buildingai/utils');
var common = require('@nestjs/common');
var article_entity = require('../../../db/entities/article.entity');
var category_service = require('../../category/services/category.service');

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate, "_ts_decorate");
function _ts_metadata(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata, "_ts_metadata");
function _ts_param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param, "_ts_param");
class ArticleService extends base.BaseService {
  static {
    __name(this, "ArticleService");
  }
  articleRepository;
  categoryService;
  userService;
  /**
   * Constructor
   */
  constructor(articleRepository, categoryService, userService) {
    super(articleRepository), this.articleRepository = articleRepository, this.categoryService = categoryService, this.userService = userService;
  }
  /**
   * Format author info, return anonymous if author is null
   *
   * @param article Article entity
   * @returns Article with formatted author
   */
  formatArticleAuthor(article) {
    if (!article.author) {
      return {
        ...article,
        author: {
          id: null,
          nickname: "\u4F5A\u540D",
          avatar: null
        }
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
  formatArticleListAuthors(articles) {
    return articles.map((article) => this.formatArticleAuthor(article));
  }
  /**
   * Create an article
   *
   * @param createArticleDto DTO for creating an article
   * @returns Created article
   */
  async createArticle(createArticleDto, authorId) {
    if (createArticleDto.categoryId) {
      const category = await this.categoryService.findOneById(createArticleDto.categoryId);
      if (!category) {
        throw errors.HttpErrorFactory.badRequest("Category does not exist");
      }
    }
    const author = await this.userService.findUserById(authorId);
    if (!author) {
      throw errors.HttpErrorFactory.notFound("Author not found");
    }
    const articleData = {
      ...createArticleDto,
      status: createArticleDto.status ?? article_entity.ArticleStatus.DRAFT,
      sort: createArticleDto.sort ?? 0,
      viewCount: 0,
      author
    };
    if (articleData.status === article_entity.ArticleStatus.PUBLISHED) {
      articleData.publishedAt = /* @__PURE__ */ new Date();
    }
    const article = await super.create(articleData, {
      includeFields: [
        "author.id",
        "author.avatar",
        "author.nickname"
      ]
    });
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
  async list(queryArticleDto) {
    const { title, status, categoryId } = queryArticleDto;
    const where = utils.buildWhere({
      title: title ? typeorm.Like(`%${title}%`) : void 0,
      status,
      categoryId
    });
    const result = await this.paginate(queryArticleDto, {
      where,
      relations: [
        "category",
        "author"
      ],
      order: {
        sort: "DESC",
        createdAt: "DESC"
      },
      select: {
        author: {
          id: true,
          avatar: true,
          nickname: true
        }
      }
    });
    result.items = this.formatArticleListAuthors(result.items);
    return result;
  }
  /**
   * Get article by id with category relation
   *
   * @param id Article id
   * @returns Article detail
   */
  async findArticleById(id) {
    const article = await this.articleRepository.findOne({
      where: {
        id
      },
      relations: [
        "category",
        "author"
      ],
      select: {
        author: {
          id: true,
          avatar: true,
          nickname: true
        }
      }
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
  async updateArticleById(id, updateArticleDto) {
    const article = await this.articleRepository.findOne({
      where: {
        id
      }
    });
    if (!article) {
      throw errors.HttpErrorFactory.notFound(`Article ${id} does not exist`);
    }
    const oldCategoryId = article.categoryId;
    const newCategoryId = updateArticleDto.categoryId;
    if (newCategoryId && newCategoryId !== oldCategoryId) {
      const category = await this.categoryService.findOneById(newCategoryId);
      if (!category) {
        throw errors.HttpErrorFactory.badRequest("Category does not exist");
      }
    }
    const oldStatus = article.status;
    const newStatus = updateArticleDto.status;
    if (newStatus && newStatus !== oldStatus) {
      if (newStatus === article_entity.ArticleStatus.PUBLISHED && !article.publishedAt) {
        updateArticleDto["publishedAt"] = /* @__PURE__ */ new Date();
      }
    }
    const updatedArticle = await super.updateById(id, updateArticleDto);
    if (newCategoryId !== void 0 && newCategoryId !== oldCategoryId) {
      if (oldCategoryId) {
        await this.categoryService.decrementArticleCount(oldCategoryId);
      }
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
  async delete(id) {
    const article = await this.articleRepository.findOne({
      where: {
        id
      }
    });
    if (!article) {
      throw errors.HttpErrorFactory.notFound(`Article ${id} does not exist`);
    }
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
  async batchDelete(ids) {
    const articles = await this.articleRepository.find({
      where: {
        id: typeorm.In(ids)
      }
    });
    const categoryCountMap = /* @__PURE__ */ new Map();
    for (const article of articles) {
      if (article.categoryId) {
        const count = categoryCountMap.get(article.categoryId) || 0;
        categoryCountMap.set(article.categoryId, count + 1);
      }
    }
    for (const [categoryId, count] of categoryCountMap.entries()) {
      await this.categoryService.decrementArticleCount(categoryId, count);
    }
    await this.deleteMany(ids);
  }
  /**
   * Publish article
   *
   * @param id Article id
   * @returns Updated article
   */
  async publish(id) {
    const article = await this.articleRepository.findOne({
      where: {
        id
      }
    });
    if (!article) {
      throw errors.HttpErrorFactory.notFound(`Article ${id} does not exist`);
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
  async unpublish(id) {
    const article = await this.articleRepository.findOne({
      where: {
        id
      }
    });
    if (!article) {
      throw errors.HttpErrorFactory.notFound(`Article ${id} does not exist`);
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
  async incrementViewCount(id) {
    const article = await this.articleRepository.findOne({
      where: {
        id
      }
    });
    if (!article) {
      throw errors.HttpErrorFactory.notFound(`Article ${id} does not exist`);
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
  async getPublishedArticles(categoryId) {
    const where = {
      status: article_entity.ArticleStatus.PUBLISHED
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    const articles = await this.articleRepository.find({
      where,
      relations: [
        "category",
        "author"
      ],
      order: {
        publishedAt: "DESC",
        sort: "DESC"
      },
      select: {
        author: {
          id: true,
          avatar: true,
          nickname: true
        }
      }
    });
    return this.formatArticleListAuthors(articles);
  }
}
ArticleService = _ts_decorate([
  common.Injectable(),
  _ts_param(0, typeorm$1.InjectRepository(article_entity.Article)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof typeorm.Repository === "undefined" ? Object : typeorm.Repository,
    typeof category_service.CategoryService === "undefined" ? Object : category_service.CategoryService,
    typeof extensionSdk.PublicUserService === "undefined" ? Object : extensionSdk.PublicUserService
  ])
], ArticleService);

exports.ArticleService = ArticleService;
