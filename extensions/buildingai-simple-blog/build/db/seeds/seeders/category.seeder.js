'use strict';

var db = require('@buildingai/db');
var path = require('path');
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
class CategorySeeder extends db.BaseSeeder {
  static {
    __name(this, "CategorySeeder");
  }
  name = "CategorySeeder";
  priority = 100;
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
    const repository = dataSource.getRepository(category_entity.Category);
    const count = await repository.count();
    return count === 0;
  }
  /**
   * Run seeder
   */
  async run(dataSource) {
    const repository = dataSource.getRepository(category_entity.Category);
    const categories = await this.loadConfig("blog-categories.json");
    this.logInfo(`Preparing to insert ${categories.length} blog categories`);
    for (const categoryData of categories) {
      const category = repository.create({
        name: categoryData.name,
        description: categoryData.description ?? void 0,
        sort: categoryData.sort ?? 0,
        articleCount: categoryData.articleCount ?? 0
      });
      await repository.save(category);
      this.logInfo(`Inserted category: ${category.name}`);
    }
    this.logSuccess(`Successfully inserted ${categories.length} blog categories`);
  }
}

exports.CategorySeeder = CategorySeeder;
