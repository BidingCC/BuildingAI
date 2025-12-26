// 扩展插件加载器（必须在 UniHelperPages 之前）
/** @see https://github.com/vitejs/vite */

import { uniappExtensions, uniMiddleware, uniPagesMeta } from "@buildingai/vite-plugins";
/** @see https://uni-helper.js.org/plugin-uni */
import Uni from "@uni-helper/plugin-uni";
/** @see https://github.com/antfu/unplugin-auto-import */
import { uniuseAutoImports } from "@uni-helper/uni-use";
/** @see https://uni-helper.js.org/vite-plugin-uni-components */
import UniHelperComponents from "@uni-helper/vite-plugin-uni-components";
/** @see https://uni-helper.js.org/vite-plugin-uni-layouts */
import UniHelperLayouts from "@uni-helper/vite-plugin-uni-layouts";
/** @see https://uni-helper.js.org/vite-plugin-uni-manifest */
import UniHelperManifest from "@uni-helper/vite-plugin-uni-manifest";
/** @see https://uni-helper.js.org/vite-plugin-uni-pages */
import UniHelperPages from "@uni-helper/vite-plugin-uni-pages";
/** @see https://github.com/uni-ku/bundle-optimizer */
import Optimization from "@uni-ku/bundle-optimizer";
import dotenv from "dotenv";
import { resolve } from "path";
/** @see https://unocss.dev/integrations/vite */
import UnoCSS from "unocss/vite";
/** @see https://github.com/antfu/unplugin-auto-import */
import AutoImport from "unplugin-auto-import/vite";
import { fileURLToPath } from "url";
/** @see https://vitejs.dev/config/ */
import { defineConfig } from "vite";
/** @see https://github.com/dcloudio/vite-plugin-uni-polyfill */
import UniPolyfill from "vite-plugin-uni-polyfill";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

dotenv.config({
    path: resolve(__dirname, "../../../.env"),
    quiet: true,
});

/** @see https://vitejs.dev/config/ */
export default defineConfig({
    plugins: [
        uniappExtensions({
            extensionsDir: "../../../extensions",
            enableHmr: true,
        }),
        uniMiddleware({
            middlewareDir: "src/middleware",
            pagesJsonPath: "src/pages.json",
        }),
        uniPagesMeta({
            pagesJsonPath: "src/pages.json",
        }),
        UniHelperManifest(),
        UniHelperPages({
            dts: "src/types/uni-pages.d.ts",
            homePage: "pages/chat/index",
            subPackages: ["src/packages"],
            exclude: ["**/components/**/*.*"],
        }),
        UniHelperLayouts(),
        UniHelperComponents({
            dts: "src/types/components.d.ts",
            directoryAsNamespace: true,
        }),
        Optimization({
            enable: {
                optimization: true,
                "async-import": true,
                "async-component": true,
            },
            dts: {
                enable: true,
                base: "src/types",
            },
            logger: false,
        }),
        Uni(),
        UniPolyfill(),
        AutoImport({
            imports: [
                "vue",
                "vue-i18n",
                {
                    "@vueuse/core": [
                        // 排除与 @uni-helper/uni-use 重复的函数
                        // 这些函数在 uni-app 环境中应使用 @uni-helper/uni-use 的版本
                        "!tryOnScopeDispose",
                        "!useNetwork",
                        "!useOnline",
                        "!usePreferredDark",
                        "!useStorage",
                        "!useStorageAsync",
                        "!useDownloadFile",
                    ],
                },
                "uni-app",
                {
                    pinia: ["storeToRefs"],
                },
                uniuseAutoImports(),
            ],
            ignore: ["useToast"],
            dts: "src/types/auto-imports.d.ts",
            dirs: ["src/stores", "src/utils", "src/hooks"],
            vueTemplate: true,
        }),
        /** @see https://github.com/antfu/unocss */
        UnoCSS(),
    ],
    server: {
        host: "0.0.0.0",
        hmr: true,
        port: 4092,
    },
    build: {
        target: "es6",
        /** @see https://cn.vitejs.dev/config/build-options.html#build-csstarget */
        cssTarget: "chrome61",
    },
    optimizeDeps: {
        exclude: ["vue-demi"],
        include: [
            "markstream-vue",
            "stream-markdown-parser",
            "markdown-it-emoji",
            "markdown-it-ins",
            "markdown-it-mark",
            "markdown-it-sub",
            "markdown-it-sup",
            "markdown-it-container",
            "mdurl",
            "uc.micro",
        ],
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
