'use strict';

var decorators = require('@buildingai/core/decorators');
var entities = require('@buildingai/db/entities');
var typeorm = require('typeorm');
var category_entity = require('./category.entity');

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
var ArticleStatus = /* @__PURE__ */ (function(ArticleStatus2) {
  ArticleStatus2["DRAFT"] = "draft";
  ArticleStatus2["PUBLISHED"] = "published";
  return ArticleStatus2;
})({});
class Article {
  static {
    __name(this, "Article");
  }
  /**
   * Article ID
   */
  id;
  /**
   * Article title
   */
  title;
  /**
   * Article summary
   */
  summary;
  /**
   * Article content
   */
  content;
  /**
   * Cover image URL
   */
  cover;
  /**
   * Article status
   */
  status;
  /**
   * View count
   */
  viewCount;
  /**
   * Sort order
   */
  sort;
  /**
   * Category ID
   */
  categoryId;
  /**
   * Published time
   */
  publishedAt;
  /**
   * Created time
   */
  createdAt;
  /**
   * Updated time
   */
  updatedAt;
  /**
   * Category relation
   */
  category;
  /**
   * Author relation
   */
  author;
  /**
   * Check if article is published
   *
   * @returns Whether the article is published
   */
  isPublished() {
    return this.status === "published";
  }
  /**
   * Check if article is draft
   *
   * @returns Whether the article is draft
   */
  isDraft() {
    return this.status === "draft";
  }
  /**
   * Increment view count
   *
   * @param count Increment value, default 1
   */
  incrementViewCount(count = 1) {
    this.viewCount += count;
  }
  /**
   * Publish article
   */
  publish() {
    this.status = "published";
    if (!this.publishedAt) {
      this.publishedAt = /* @__PURE__ */ new Date();
    }
  }
  /**
   * Unpublish article (revert to draft)
   */
  unpublish() {
    this.status = "draft";
  }
}
_ts_decorate([
  typeorm.PrimaryGeneratedColumn("uuid"),
  _ts_metadata("design:type", String)
], Article.prototype, "id", void 0);
_ts_decorate([
  typeorm.Column({
    length: 200,
    comment: "Article title"
  }),
  _ts_metadata("design:type", String)
], Article.prototype, "title", void 0);
_ts_decorate([
  typeorm.Column({
    type: "text",
    nullable: true,
    comment: "Article summary"
  }),
  _ts_metadata("design:type", String)
], Article.prototype, "summary", void 0);
_ts_decorate([
  typeorm.Column({
    type: "text",
    comment: "Article content"
  }),
  _ts_metadata("design:type", String)
], Article.prototype, "content", void 0);
_ts_decorate([
  typeorm.Column({
    length: 500,
    nullable: true,
    comment: "Cover image URL"
  }),
  _ts_metadata("design:type", String)
], Article.prototype, "cover", void 0);
_ts_decorate([
  typeorm.Column({
    type: "varchar",
    length: 20,
    default: "draft",
    comment: "Article status: draft, published"
  }),
  _ts_metadata("design:type", String)
], Article.prototype, "status", void 0);
_ts_decorate([
  typeorm.Column({
    type: "int",
    default: 0,
    comment: "View count"
  }),
  _ts_metadata("design:type", Number)
], Article.prototype, "viewCount", void 0);
_ts_decorate([
  typeorm.Column({
    type: "int",
    default: 0,
    comment: "Sort order, larger values appear first"
  }),
  _ts_metadata("design:type", Number)
], Article.prototype, "sort", void 0);
_ts_decorate([
  typeorm.Column({
    type: "uuid",
    nullable: true,
    comment: "Category ID"
  }),
  _ts_metadata("design:type", String)
], Article.prototype, "categoryId", void 0);
_ts_decorate([
  typeorm.Column({
    type: "timestamp",
    nullable: true,
    comment: "Published time"
  }),
  _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Article.prototype, "publishedAt", void 0);
_ts_decorate([
  typeorm.CreateDateColumn({
    comment: "Created time"
  }),
  _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Article.prototype, "createdAt", void 0);
_ts_decorate([
  typeorm.UpdateDateColumn({
    comment: "Updated time"
  }),
  _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Article.prototype, "updatedAt", void 0);
_ts_decorate([
  typeorm.ManyToOne(() => category_entity.Category, (category) => category.articles),
  typeorm.JoinColumn({
    name: "categoryId"
  }),
  _ts_metadata("design:type", typeof category_entity.Category === "undefined" ? Object : category_entity.Category)
], Article.prototype, "category", void 0);
_ts_decorate([
  typeorm.ManyToOne(() => entities.User, {
    nullable: true
  }),
  typeorm.JoinColumn({
    name: "authorId"
  }),
  _ts_metadata("design:type", typeof entities.User === "undefined" ? Object : entities.User)
], Article.prototype, "author", void 0);
Article = _ts_decorate([
  decorators.ExtensionEntity()
], Article);

exports.Article = Article;
exports.ArticleStatus = ArticleStatus;
