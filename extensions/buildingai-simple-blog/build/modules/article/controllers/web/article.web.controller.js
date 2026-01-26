'use strict';

var base = require('@buildingai/base');
var decorators = require('@buildingai/core/decorators');
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
class ArticleWebController extends base.BaseController {
  static {
    __name(this, "ArticleWebController");
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
   * Query article list
   *
   * @param queryArticleDto DTO for querying articles
   * @returns Article list
   */
  async findAll(queryArticleDto) {
    return this.articleService.list(queryArticleDto);
  }
  /**
   * Get published articles
   *
   * @param categoryId Optional category filter
   * @returns Published article list
   */
  async getPublished(categoryId) {
    return this.articleService.getPublishedArticles(categoryId);
  }
  /**
   * Get article by id
   *
   * @param id Article id
   * @returns Article detail
   */
  async findOne(id) {
    const article = await this.articleService.findOneById(id, {
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
    if (article) {
      await this.articleService.incrementViewCount(id);
    }
    return article;
  }
}
_ts_decorate([
  common.Get(),
  _ts_param(0, common.Query()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof dto.QueryArticleDto === "undefined" ? Object : dto.QueryArticleDto
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleWebController.prototype, "findAll", null);
_ts_decorate([
  common.Get("published"),
  _ts_param(0, common.Query("categoryId")),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleWebController.prototype, "getPublished", null);
_ts_decorate([
  common.Get(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], ArticleWebController.prototype, "findOne", null);
ArticleWebController = _ts_decorate([
  decorators.ExtensionWebController("article"),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof article_service.ArticleService === "undefined" ? Object : article_service.ArticleService
  ])
], ArticleWebController);

exports.ArticleWebController = ArticleWebController;
