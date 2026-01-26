import { createResolver } from "@nuxt/kit";
import { defu } from "defu";
import { defineNuxtConfig } from "nuxt/config";
import type { NuxtConfig } from "nuxt/schema";

export type { NuxtConfig } from "nuxt/schema";
import icons from "./assets/icons/icons.json";

/**
 * Extended Nuxt configuration interface with additional properties
 * This interface extends the base NuxtConfig to include all native properties
 * plus additional module-specific configurations
 */
export interface ExtendedNuxtConfig extends NuxtConfig {
    // Additional module-specific configurations
    colorMode?: {
        preference?: "system" | "light" | "dark";
        fallback?: "light" | "dark";
        hid?: string;
        globalName?: string;
        componentName?: string;
        classPrefix?: string;
        classSuffix?: string;
        storage?: "localStorage" | "sessionStorage";
        storageKey?: string;
    };
    ui?: {
        prefix?: string;
        fonts?: boolean;
        colorMode?: boolean;
        theme?: {
            colors?: string[];
        };
    };
    eslint?: {
        config?: {
            standalone?: boolean;
            nuxt?: { sortConfigKeys?: boolean };
            stylistic?: boolean;
        };
        checker?: boolean;
    };
    i18n?: {
        strategy?: "no_prefix" | "prefix_except_default" | "prefix" | "prefix_and_default";
        defaultLocale?: "zh" | "en" | "jp";
        detectBrowserLanguage?: {
            useCookie?: boolean;
            cookieKey?: string;
            redirectOn?: "root" | "no prefix";
        };
    };
    icon?: {
        serverBundle?: "local" | "remote";
        mode?: "css" | "svg";
        cssLayer?: string;
        clientBundle?: {
            scan?: boolean;
            icons?: string[];
            sizeLimitKb?: number;
        };
        customCollections?: {
            prefix?: string;
            dir?: string;
        }[];
    };
}

const MAIN_APP_CORE_MODULES = [
    "@buildingai/nuxt/modules/buildingai-ui",
    "@buildingai/nuxt/modules/buildingai-hooks",
    "@buildingai/nuxt/modules/buildingai-stores",
    "@buildingai/nuxt/modules/buildingai-i18n",
    "@buildingai/nuxt/modules/buildingai-components",
    "@buildingai/nuxt/modules/buildingai-pages",
] as const;

/**
 * Custom array merging function for defu
 * Arrays are merged by combining unique values
 */
function arrayFn(objKey: string, value: unknown, srcValue: unknown) {
    if (Array.isArray(value) && Array.isArray(srcValue)) {
        return [...new Set([...srcValue, ...value])];
    }
    // Return undefined to use default defu behavior
    return undefined;
}

/**
 * Merges vite.optimizeDeps.include arrays from parent and child configs
 * This ensures all dependencies are included regardless of defu merge order
 */
function mergeOptimizeDeps(
    mergedConfig: ExtendedNuxtConfig,
    defaultConfig: ExtendedNuxtConfig,
    config: Partial<ExtendedNuxtConfig>,
): void {
    if (config.vite?.optimizeDeps?.include && defaultConfig.vite?.optimizeDeps?.include) {
        const defaultInclude = Array.isArray(defaultConfig.vite.optimizeDeps.include)
            ? defaultConfig.vite.optimizeDeps.include
            : [];
        const configInclude = Array.isArray(config.vite.optimizeDeps.include)
            ? config.vite.optimizeDeps.include
            : [];

        mergedConfig.vite = mergedConfig.vite || {};
        mergedConfig.vite.optimizeDeps = {
            ...defaultConfig.vite.optimizeDeps,
            ...config.vite.optimizeDeps,
            include: [...new Set([...defaultInclude, ...configInclude])],
        };
    }
}

/**
 * Configuration presets for different plugin types
 */
export const configPresets: ExtendedNuxtConfig = {
    ssr: process.env.NUXT_BUILD_SSR === "true",
    devServer: {
        host: "localhost,0.0.0.0",
        port: 4091,
    },
    devtools: { enabled: false },
    app: {
        rootId: "nuxt-app",
    },
    modules: [
        "@vueuse/nuxt",
        "@pinia/nuxt",
        "@nuxtjs/color-mode",
        "@nuxt/image",
        "nuxt-svgo",
        "@nuxt/ui",
        "@nuxtjs/i18n",
        "@nuxt/eslint",
        "motion-v/nuxt",
    ],
    css: ["@buildingai/nuxt/styles/globals.css"],
    plugins: [
        "@buildingai/nuxt/plugins/theme.ts",
        "@buildingai/nuxt/plugins/ripple.ts",
        "@buildingai/nuxt/plugins/dompurify-html.ts",
    ],
    pages: {
        pattern: ["**/*.vue", "!**/_*/**", "!**/components/**"],
    },
    dir: {
        app: "./app",
    },
    components: [
        {
            path: "components",
            pathPrefix: false,
            global: false,
            watch: false,
            ignore: ["**/components/**/*.*", "**/model-modal/**/*.*"],
        },
    ],
    unhead: {
        renderSSRHeadOptions: {
            omitLineBreaks: false,
        },
    },
    colorMode: {
        preference: "system",
        fallback: "light",
        hid: "nuxt-color-mode-script",
        globalName: "__NUXT_COLOR_MODE__",
        componentName: "ColorScheme",
        classPrefix: "",
        classSuffix: "",
        storage: "localStorage",
        storageKey: "nuxt-color-mode",
    },
    hooks: {
        "build:manifest": (manifest) => {
            for (const key in manifest) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const file = manifest[key] as Record<string, any>;
                file.preload = false;
                file.prefetch = false;
            }
        },
    },
    ui: {
        prefix: "U",
        fonts: false,
        colorMode: true,
        theme: {
            colors: ["primary", "secondary", "success", "info", "warning", "error"],
        },
    },
    sourcemap: false,
    experimental: {
        asyncContext: true,
        asyncEntry: false,
        restoreState: false,
        inlineRouteRules: false,
        renderJsonPayloads: false,
        payloadExtraction: false,
        clientFallback: false,
        crossOriginPrefetch: true,
        viewTransition: true,
        writeEarlyHints: false,
        componentIslands: false,
        localLayerAliases: false,
        typedPages: true,
        watcher: "parcel",
        sharedPrerenderData: false,
        clientNodeCompat: false,
        cookieStore: true,
        buildCache: false,
        normalizeComponentNames: false,
        browserDevtoolsTiming: true,
        debugModuleMutation: false,
        lazyHydration: true,
        templateImportResolution: false,
        decorators: false,
        purgeCachedData: true,
        granularCachedData: false,
        pendingWhenIdle: false,
        defaults: {
            useAsyncData: {
                deep: true,
            },
        },
    },
    vite: {
        optimizeDeps: {
            include:
                process.env.NUXT_BUILD_ENV === "development"
                    ? [
                          "@tanstack/table-core",
                          "@internationalized/date",
                          "reka-ui",
                          "@tiptap/vue-3",
                          "@tiptap/starter-kit",
                          "@iconify-json/lucide",
                          "yup",
                          "@intlify/shared",
                          "@intlify/core-base",
                          "vue-renderer-markdown",
                          "echarts/charts",
                          "vue-dompurify-html",
                          "echarts/components",
                          "echarts/core",
                          "echarts/features",
                          "echarts/renderers",
                          "tailwindcss/colors",
                          "motion-v",
                          "@fancyapps/ui",
                          "uuid",
                          "@nuxt/ui/locale",
                          "clsx",
                          "tailwind-merge",
                          "@tiptap/extension-color",
                          "@tiptap/extension-image",
                          "@tiptap/extension-link",
                          "@tiptap/extension-list-item",
                          "@tiptap/extension-placeholder",
                          "@tiptap/extension-text-style",
                          "@tiptap/extension-underline",
                          "@tiptap/extension-highlight",
                          "tiptap-markdown",
                          "vuedraggable",
                      ]
                    : [],
            exclude: [
                "@internationalized/date",
                "@fancyapps/ui",
                "monaco-editor",
                "shiki",
                "shikijs",
                "@shikijs/langs",
            ],
            holdUntilCrawlEnd: true,
        },
        resolve: {
            // 将 monaco-editor 和 stream-monaco 重定向到空模块，完全排除打包
            alias: {
                "monaco-editor": "data:text/javascript,export default {}",
                shiki: "data:text/javascript,export default {}",
                shikijs: "data:text/javascript,export default {}",
                "@shikijs/langs": "data:text/javascript,export default {}",
            },
        },
        build: {
            target: "esnext",
            cssCodeSplit: false,
            minify: "esbuild",
            sourcemap: false,
        },
    },
    telemetry: { enabled: false },
    eslint: {
        config: {
            standalone: false,
            nuxt: { sortConfigKeys: true },
            stylistic: false,
        },
        checker: true,
    },
    typescript: {
        strict: true,
        typeCheck: true,
        tsConfig: {
            compilerOptions: {
                strictPropertyInitialization: false,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                resolveJsonModule: true,
                paths: {
                    "@buildingai/api/types": ["../../api/src/types/index.ts"],
                },
            },
            exclude: ["src/api/**/*"],
        },
    },
    nitro: {
        esbuild: { options: { target: "esnext" } },
        // prerender: {
        //     crawlLinks: false,
        //     failOnError: false,
        //     routes: [],
        //     autoSubfolderIndex: true,
        // },
        preset: "static",
        compressPublicAssets: false,
        minify: false,
        experimental: {
            wasm: false,
        },
        externals: {
            inline: ["node:process", "node:path", "node:fs", "node:os", "node:crypto"],
        },
    },
    i18n: {
        strategy: "no_prefix",
        defaultLocale: "en",
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "nuxt-ui-language",
            redirectOn: "root",
        },
    },
    icon: {
        serverBundle: "local",
        clientBundle: {
            // scan: true,
            icons,
            sizeLimitKb: 10 * 1024,
        },
    },
};

export function defineBuildingAIConfig(config: Partial<ExtendedNuxtConfig> = {}): NuxtConfig {
    const defaultConfig = configPresets as ExtendedNuxtConfig;

    const mergedConfig = defu(defaultConfig, config, arrayFn);

    // Merge optimizeDeps.include from both configs
    mergeOptimizeDeps(mergedConfig, defaultConfig, config);

    const nuxtConfig = defineNuxtConfig({
        ...mergedConfig,
        modules: [
            ...(mergedConfig.modules || []),
            ...MAIN_APP_CORE_MODULES.filter((module) => !mergedConfig.modules?.includes(module)),
        ],
        app: {
            ...mergedConfig.app,
        },
        runtimeConfig: {
            ...mergedConfig.runtimeConfig,
            public: {
                ...mergedConfig.runtimeConfig?.public,
                isPlugin: false,
                EXTENSION_API_URL:
                    process.env.NODE_ENV === "development"
                        ? process.env.EXTENSION_API_URL || "https://cloud.buildingai.cc/api"
                        : "https://cloud.buildingai.cc/api",
            },
        },
    });

    return nuxtConfig;
}

export function defineBuildingAIExtensionConfig(
    extension: string,
    config: Partial<ExtendedNuxtConfig> = {},
): NuxtConfig {
    const defaultConfig = configPresets as ExtendedNuxtConfig;
    const mergedConfig = defu(config, defaultConfig, arrayFn, {
        hooks: {
            "pages:routerOptions"({
                files,
            }: {
                files: Array<{ path: string; optional?: boolean }>;
            }) {
                const resolver = createResolver(process.cwd());
                files.push({
                    path: resolver.resolve("src/web/router.options.ts"),
                    optional: true,
                });
            },
        },
    });

    // Merge optimizeDeps.include from both configs
    mergeOptimizeDeps(mergedConfig, defaultConfig, config);

    return defineNuxtConfig({
        ...mergedConfig,
        modules: [
            ...(mergedConfig.modules || []),
            ...MAIN_APP_CORE_MODULES.filter((module) => !mergedConfig.modules?.includes(module)),
        ],
        srcDir: "src/web/",
        app: {
            ...mergedConfig.app,
            baseURL: `/extension/${extension}`,
        },
        runtimeConfig: {
            ...mergedConfig.runtimeConfig,
            public: {
                ...mergedConfig.runtimeConfig?.public,
                pluginName: extension,
                isPlugin: true,
            },
        },
    });
}
