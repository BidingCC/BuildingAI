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
class CategoryWebController extends base.BaseController {
  static {
    __name(this, "CategoryWebController");
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
}
_ts_decorate([
  common.Get(),
  _ts_param(0, common.Query()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof dto.QueryCategoryDto === "undefined" ? Object : dto.QueryCategoryDto
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryWebController.prototype, "findAll", null);
_ts_decorate([
  common.Get(":id"),
  _ts_param(0, common.Param("id", paramValidate_pipe.UUIDValidationPipe)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    String
  ]),
  _ts_metadata("design:returntype", Promise)
], CategoryWebController.prototype, "findOne", null);
CategoryWebController = _ts_decorate([
  decorators.ExtensionWebController("category"),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof category_service.CategoryService === "undefined" ? Object : category_service.CategoryService
  ])
], CategoryWebController);

exports.CategoryWebController = CategoryWebController;
