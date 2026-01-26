'use strict';

var base = require('@buildingai/base');
var decorators = require('@buildingai/core/decorators');
var playground_decorator = require('@buildingai/decorators/playground.decorator');
var paramValidate_pipe = require('@buildingai/pipe/param-validate.pipe');
var common = require('@nestjs/common');
var dto = require('../../dto');
var article_service = require('../../services/article.service');

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
class ArticleController extends base.BaseController {
  static {
    __name(this, "ArticleController");
  }
  articleService;
  /**
   * Constructor
   *
   * @param articleService Article service
   */
  constructor(articleService) {
    super(), this.articleService = articleService;
  }
  /**
   * Create an article
   *
   * @param createArticleDto DTO for creating an article
   * @returns Created article
   */
  async create(createArticleDto, user) {
    return this.articleService.createArticle(createArticleDto, user.id);
  }
  /**
   * Query article list
   *
   * @param queryArticleDto DTO for querying articles
   * @returns Article list
   */
  async findAll(queryArticleDto) {
    return this.articleService.list(queryArticleDto);
  }
  /**
   * Get article by id
   *
   * @param id Article id
   * @returns Article detail
   */
  async findOne(id) {
    return this.articleService.findOneById(id);
  }
  /**
   * Update article
   *
   * @param id Article id
   * @param updateArticleDto DTO for updating an article
   * @returns Updated article
   */
  async update(id, updateArticleDto) {
    return this.articleService.updateArticleById(id, updateArticleDto);
  }
  /**
   * Delete article
   *
   * @param id Article id
   * @returns Operation result
   */
  async remove(id) {
    const article = await this.articleService.findOneById(id);
    if (!article) {
      return {
        success: false,
        message: "Article does not exist"
      };
    }
    await this.articleService.delete(id);
    return {
      success: true,
      message: "Deleted successfully"
    };
  }
  /**
   * Batch delete articles
   *
   * @param ids Article ids
   * @returns Operation result
   */
  async batchRemove(ids) {
    try {
      await this.articleService.batchDelete(ids);
      return {
        success: true,
        message: "Batch deletion succeeded"
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  /**
   * Publish article
   *
   * @param id Article id
   * @returns Operation result
   */
  async publish(id) {
    try {
      await this.articleService.publish(id);
      return {
        success: true,
        message: "Published successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  /**
   * Unpublish article
   *
   * @param id Article id
   * @returns Operation result
   */
  async unpublish(id) {
    try {
      await this.articleService.unpublish(id);
      return {
        success: true,
        message: "Unpublished successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
_ts_decorate([
  common.Post(),
  _ts_param(0, common.Body()),
  _ts_param(1, playground_decorator.Playground()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof dto.CreateArticleDto === "undefined" ? Object : dto.CreateArticleDto,
    typeof UserPlayground === "undefined" ? Object : UserPlayground
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "create", null);
_ts_decorate([
  common.Get(),
  _ts_param(0, common.Query()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof dto.QueryArticleDto === "undefined" ? Object : dto.QueryArticleDto
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "findAll", null);
_ts_decorate([
  common.Get(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "findOne", null);
_ts_decorate([
  common.Put(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_param(1, common.Body()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String,
    typeof dto.UpdateArticleDto === "undefined" ? Object : dto.UpdateArticleDto
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "update", null);
_ts_decorate([
  common.Delete(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "remove", null);
_ts_decorate([
  common.Post("batch-delete"),
  _ts_param(0, common.Body("ids")),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    Array
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "batchRemove", null);
_ts_decorate([
  common.Post(":id/publish"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "publish", null);
_ts_decorate([
  common.Post(":id/unpublish"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleController.prototype, "unpublish", null);
ArticleController = _ts_decorate([
  decorators.ExtensionConsoleController("article", "Blog Article Management"),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof article_service.ArticleService === "undefined" ? Object : article_service.ArticleService
  ])
], ArticleController);

exports.ArticleController = ArticleController;
