'use strict';

var common = require('@nestjs/common');
var article_module = require('./article/article.module');
var category_module = require('./category/category.module');

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate, "_ts_decorate");
class AppModule {
  static {
    __name(this, "AppModule");
  }
}
AppModule = _ts_decorate([
  common.Module({
    imports: [
      category_module.CategoryModule,
      article_module.ArticleModule
    ],
    exports: [
      category_module.CategoryModule,
      article_module.ArticleModule
    ]
  })
], AppModule);

exports.AppModule = AppModule;
