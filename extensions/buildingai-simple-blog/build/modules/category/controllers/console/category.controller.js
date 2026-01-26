'use strict';

var base = require('@buildingai/base');
var decorators = require('@buildingai/core/decorators');
var paramValidate_pipe = require('@buildingai/pipe/param-validate.pipe');
var common = require('@nestjs/common');
var dto = require('../../dto');
var category_service = require('../../services/category.service');

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
class CategoryController extends base.BaseController {
  static {
    __name(this, "CategoryController");
  }
  categoryService;
  /**
   * Constructor
   *
   * @param categoryService Category service
   */
  constructor(categoryService) {
    super(), this.categoryService = categoryService;
  }
  /**
   * Create a category
   *
   * @param createCategoryDto DTO for creating a category
   * @returns Created category
   */
  async create(createCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }
  /**
   * Query category list
   *
   * @param queryCategoryDto DTO for querying categories
   * @returns Category list
   */
  async findAll(queryCategoryDto) {
    return this.categoryService.list(queryCategoryDto);
  }
  /**
   * Get category by id
   *
   * @param id Category id
   * @returns Category detail
   */
  async findOne(id) {
    return this.categoryService.findOneById(id);
  }
  /**
   * Update category
   *
   * @param id Category id
   * @param updateCategoryDto DTO for updating a category
   * @returns Updated category
   */
  async update(id, updateCategoryDto) {
    return this.categoryService.updateCategoryById(id, updateCategoryDto);
  }
  /**
   * Delete category
   *
   * @param id Category id
   * @returns Operation result
   */
  async remove(id) {
    const category = await this.categoryService.findOneById(id);
    if (!category) {
      return {
        success: false,
        message: "Category does not exist"
      };
    }
    if (category.articleCount > 0) {
      return {
        success: false,
        message: "This category is in use and cannot be deleted"
      };
    }
    await this.categoryService.delete(id);
    return {
      success: true,
      message: "Deleted successfully"
    };
  }
  /**
   * Batch delete categories
   *
   * @param ids Category ids
   * @returns Operation result
   */
  async batchRemove(ids) {
    try {
      await this.categoryService.batchDelete(ids);
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
}
_ts_decorate([
  common.Post(),
  _ts_param(0, common.Body()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof dto.CreateCategoryDto === "undefined" ? Object : dto.CreateCategoryDto
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryController.prototype, "create", null);
_ts_decorate([
  common.Get(),
  _ts_param(0, common.Query()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof dto.QueryCategoryDto === "undefined" ? Object : dto.QueryCategoryDto
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryController.prototype, "findAll", null);
_ts_decorate([
  common.Get(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryController.prototype, "findOne", null);
_ts_decorate([
  common.Put(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_param(1, common.Body()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String,
    typeof dto.UpdateCategoryDto === "undefined" ? Object : dto.UpdateCategoryDto
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryController.prototype, "update", null);
_ts_decorate([
  common.Delete(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryController.prototype, "remove", null);
_ts_decorate([
  common.Post("batch-delete"),
  _ts_param(0, common.Body("ids")),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    Array
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryController.prototype, "batchRemove", null);
CategoryController = _ts_decorate([
  decorators.ExtensionConsoleController("category", "Blog Category Management"),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof category_service.CategoryService === "undefined" ? Object : category_service.CategoryService
  ])
], CategoryController);

exports.CategoryController = CategoryController;
