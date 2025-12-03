// 导出 uniapp-extensions 插件
export { defineExtension, loadExtensionSubPackages, uniappExtensions } from "./extensions/index.js";
export type * from "./extensions/types.js";

// 导出 uni-middleware 插件
export {
    createNavigationGuard,
    defineMiddleware,
    RESOLVED_VIRTUAL_MODULE_ID,
    uniMiddleware,
    VIRTUAL_MODULE_ID,
} from "./middleware/index.js";
export type * from "./middleware/types.js";

// 导出 uni-pages-meta 插件
export { uniPagesMeta } from "./pages-meta/index.js";
export type * from "./pages-meta/types.js";
