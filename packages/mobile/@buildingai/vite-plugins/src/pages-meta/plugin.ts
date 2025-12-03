import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

export function uniPagesMeta(options: PagesMetaPluginOptions = {}): Plugin {
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
