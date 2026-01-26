'use strict';

var db = require('@buildingai/db');
var entities = require('@buildingai/db/entities');
var path = require('path');
var article_entity = require('../../entities/article.entity');
var category_entity = require('../../entities/category.entity');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
class ArticleSeeder extends db.BaseSeeder {
  static {
    __name(this, "ArticleSeeder");
  }
  name = "ArticleSeeder";
  priority = 110;
  /**
   * Override getConfigPath to use extension-relative paths
   */
  getConfigPath(fileName) {
    return path__namespace.join(__dirname, "../data", fileName);
  }
  /**
   * Check if seeder should run
   */
  async shouldRun(dataSource) {
    const repository = dataSource.getRepository(article_entity.Article);
    const count = await repository.count();
    return count === 0;
  }
  /**
   * Run seeder
   */
  async run(dataSource) {
    const articleRepository = dataSource.getRepository(article_entity.Article);
    const categoryRepository = dataSource.getRepository(category_entity.Category);
    const userRepository = dataSource.getRepository(entities.User);
    const users = await userRepository.find({
      order: {
        createdAt: "ASC"
      },
      take: 1
    });
    const firstUser = users[0];
    if (!firstUser) {
      this.logWarn("No user found, articles will be created without author (anonymous)");
    }
    const articles = await this.loadConfig("blog-articles.json");
    this.logInfo(`Preparing to insert ${articles.length} blog articles`);
    const categories = await categoryRepository.find();
    const categoryMap = new Map(categories.map((cat) => [
      cat.name,
      cat
    ]));
    for (const articleData of articles) {
      let categoryId;
      if (articleData.categoryName) {
        const category = categoryMap.get(articleData.categoryName);
        if (category) {
          categoryId = category.id;
        } else {
          this.logWarn(`Category "${articleData.categoryName}" not found for article "${articleData.title}"`);
        }
      }
      const status = articleData.status === "published" ? article_entity.ArticleStatus.PUBLISHED : article_entity.ArticleStatus.DRAFT;
      const publishedAt = status === article_entity.ArticleStatus.PUBLISHED ? /* @__PURE__ */ new Date() : void 0;
      const article = articleRepository.create({
        title: articleData.title,
        summary: articleData.summary ?? void 0,
        content: articleData.content,
        cover: articleData.cover ?? void 0,
        status,
        categoryId,
        sort: articleData.sort ?? 0,
        viewCount: articleData.viewCount ?? 0,
        publishedAt,
        author: firstUser ?? void 0
      });
      await articleRepository.save(article);
      this.logInfo(`Inserted article: ${article.title}`);
    }
    this.logSuccess(`Successfully inserted ${articles.length} blog articles`);
  }
}

exports.ArticleSeeder = ArticleSeeder;
