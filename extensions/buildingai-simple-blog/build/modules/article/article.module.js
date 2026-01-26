'use strict';

var typeorm = require('@buildingai/db/@nestjs/typeorm');
var entities = require('@buildingai/db/entities');
var extensionSdk = require('@buildingai/extension-sdk');
var common = require('@nestjs/common');
var article_entity = require('../../db/entities/article.entity');
var category_module = require('../category/category.module');
var article_controller = require('./controllers/console/article.controller');
var article_web_controller = require('./controllers/web/article.web.controller');
var article_service = require('./services/article.service');

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate, "_ts_decorate");
class ArticleModule {
  static {
    __name(this, "ArticleModule");
  }
}
ArticleModule = _ts_decorate([
  common.Module({
    imports: [
      typeorm.TypeOrmModule.forFeature([
        article_entity.Article,
        entities.User,
        entities.UserSubscription
      ]),
      category_module.CategoryModule
    ],
    controllers: [
      article_controller.ArticleController,
      article_web_controller.ArticleWebController
    ],
    providers: [
      article_service.ArticleService,
      extensionSdk.PublicUserService
    ],
    exports: [
      article_service.ArticleService
    ]
  })
], ArticleModule);

exports.ArticleModule = ArticleModule;
