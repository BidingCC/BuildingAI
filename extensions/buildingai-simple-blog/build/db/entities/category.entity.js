'use strict';

var decorators = require('@buildingai/core/decorators');
var typeorm = require('typeorm');
var article_entity = require('./article.entity');

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
class Category {
  static {
    __name(this, "Category");
  }
  /**
   * Category ID
   */
  id;
  /**
   * Category name
   */
  name;
  /**
   * Category description
   */
  description;
  /**
   * Sort order
   */
  sort;
  /**
   * Article count
   */
  articleCount;
  /**
   * Created time
   */
  createdAt;
  /**
   * Updated time
   */
  updatedAt;
  /**
   * Articles in this category
   */
  articles;
  /**
   * Increment article count
   *
   * @param count Increment value, default 1
   */
  incrementArticleCount(count = 1) {
    this.articleCount += count;
  }
  /**
   * Decrement article count
   *
   * @param count Decrement value, default 1
   */
  decrementArticleCount(count = 1) {
    this.articleCount = Math.max(0, this.articleCount - count);
  }
  /**
   * Check if category has articles
   *
   * @returns Whether the category has articles
   */
  hasArticles() {
    return this.articleCount > 0;
  }
}
_ts_decorate([
  typeorm.PrimaryGeneratedColumn("uuid"),
  _ts_metadata("design:type", String)
], Category.prototype, "id", void 0);
_ts_decorate([
  typeorm.Column({
    length: 100,
    comment: "Category name"
  }),
  _ts_metadata("design:type", String)
], Category.prototype, "name", void 0);
_ts_decorate([
  typeorm.Column({
    type: "text",
    nullable: true,
    comment: "Category description"
  }),
  _ts_metadata("design:type", String)
], Category.prototype, "description", void 0);
_ts_decorate([
  typeorm.Column({
    type: "int",
    default: 0,
    comment: "Sort order, larger values appear first"
  }),
  _ts_metadata("design:type", Number)
], Category.prototype, "sort", void 0);
_ts_decorate([
  typeorm.Column({
    type: "int",
    default: 0,
    comment: "Number of articles in this category"
  }),
  _ts_metadata("design:type", Number)
], Category.prototype, "articleCount", void 0);
_ts_decorate([
  typeorm.CreateDateColumn({
    comment: "Created time"
  }),
  _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Category.prototype, "createdAt", void 0);
_ts_decorate([
  typeorm.UpdateDateColumn({
    comment: "Updated time"
  }),
  _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Category.prototype, "updatedAt", void 0);
_ts_decorate([
  typeorm.OneToMany(() => article_entity.Article, (article) => article.category),
  _ts_metadata("design:type", Array)
], Category.prototype, "articles", void 0);
Category = _ts_decorate([
  decorators.ExtensionEntity()
], Category);

exports.Category = Category;
