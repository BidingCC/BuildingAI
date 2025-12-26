import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

import type { Plugin, ResolvedConfig } from "vite";

import type { PageMeta, PagesMetaPluginOptions } from "./types.js";
import { RESOLVED_VIRTUAL_MODULE_ID, VIRTUAL_MODULE_ID } from "./types.js";

function parseJsonc(content: string): any {
    const withoutComments = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return JSON.parse(withoutComments.replace(/,(\s*[}\]])/g, "$1"));
}

function normalizePath(path: string): string {
    return path.replace(/\\/g, "/");
}

/**
 * Generate type definition file for pages-meta
 */
function generateDtsFile(dtsPath: string, configRoot: string): void {
    const typeDefinitionContent = `declare module "virtual:pages-meta" {
    interface PageStyle {
        navigationBarTitleText?: string;
        navigationBarBackgroundColor?: string;
        navigationBarTextStyle?: string;
        [key: string]: unknown;
    }

    interface PageMeta {
        path: string;
        style?: PageStyle;
        [key: string]: unknown;
    }

    interface PagesMetaMap {
        [path: string]: PageMeta;
    }

    interface TabBarItem {
        pagePath: string;
        index: number;
        [key: string]: unknown;
    }

    export const pagesMeta: PagesMetaMap;
    export const tabBarList: TabBarItem[];
    export function getPageMeta(path: string): PageMeta | null;
    export function getPageTitle(path: string): string;
    export function getCurrentPageMeta(): PageMeta | null;
    export function getCurrentPageTitle(): string;
}
`;

    const fullPath = resolve(configRoot, dtsPath);
    const dir = dirname(fullPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, typeDefinitionContent, "utf-8");
}

export function UniPagesMeta(options: PagesMetaPluginOptions = {}): Plugin {
    const { pagesJsonPath = "src/pages.json" } = options;
    let config: ResolvedConfig;

    function generateVirtualModule(): string {
        let pagesJson: {
            pages?: PageMeta[];
            subPackages?: Array<{ root: string; pages?: PageMeta[] }>;
            tabBar?: {
                list?: Array<{ pagePath: string; [key: string]: any }>;
                [key: string]: any;
            };
        } = {};

        try {
            const fullPath = resolve(config.root, pagesJsonPath);
            pagesJson = parseJsonc(readFileSync(fullPath, "utf-8"));
        } catch {
            pagesJson = {};
        }

        const pagesMap: Record<string, PageMeta> = {};

        for (const page of pagesJson.pages || []) {
            pagesMap[page.path] = page;
        }

        for (const sub of pagesJson.subPackages || []) {
            for (const page of sub.pages || []) {
                const fullPath = `${sub.root}/${page.path}`;
                pagesMap[fullPath] = { ...page, path: fullPath };
            }
        }

        const tabBarList = (pagesJson.tabBar?.list || []).map((item, index) => ({
            ...item,
            index,
        }));

        return `export const pagesMeta = ${JSON.stringify(pagesMap, null, 2)};

export const tabBarList = ${JSON.stringify(tabBarList, null, 2)};

export function getPageMeta(path) {
    if (!path) return null;
    const cleanPath = path.replace(/^\\//, '').split('?')[0];
    return pagesMeta[cleanPath] || null;
}

export function getPageTitle(path) {
    const meta = getPageMeta(path);
    return (meta && meta.style && meta.style.navigationBarTitle) || '';
}

export function getCurrentPageMeta() {
    const pages = getCurrentPages();
    if (!pages || pages.length === 0) return null;
    const page = pages[pages.length - 1];
    if (!page) return null;
    return getPageMeta(page.route || '');
}

export function getCurrentPageTitle() {
    const meta = getCurrentPageMeta();
    return (meta && meta.style && meta.style.navigationBarTitle) || '';
}`;
    }

    return {
        name: "vite:uni-pages-meta",

        configResolved(_config) {
            config = _config;
            // Generate type definition file if dts option is specified
            if (options.dts) {
                generateDtsFile(options.dts, config.root);
            }
        },

        configureServer({ watcher, moduleGraph, ws }) {
            const fullPath = normalizePath(resolve(config.root, pagesJsonPath));
            watcher.add(fullPath);

            watcher.on("change", (path) => {
                if (normalizePath(path) === fullPath) {
                    const module = moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
                    if (module) {
                        moduleGraph.invalidateModule(module);
                        ws?.send({ type: "full-reload", path: "*" });
                    }
                }
            });
        },

        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
        },

        load(id) {
            if (id === RESOLVED_VIRTUAL_MODULE_ID) return generateVirtualModule();
        },
    };
}
