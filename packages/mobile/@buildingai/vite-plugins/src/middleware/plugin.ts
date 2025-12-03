import { resolve } from "node:path";

import type { Plugin } from "vite";
import { normalizePath } from "vite";

import { MiddlewareContext } from "./context.js";
import type { MiddlewarePluginOptions, ResolvedOptions } from "./types.js";
import { RESOLVED_VIRTUAL_MODULE_ID, VIRTUAL_MODULE_ID } from "./types.js";

function resolveOptions(userOptions: MiddlewarePluginOptions): ResolvedOptions {
    return {
        middlewareDir: userOptions.middlewareDir || "src/middleware",
        pagesJsonPath: userOptions.pagesJsonPath || "src/pages.json",
        programRoot: userOptions.programRoot || process.cwd(),
    };
}

export function uniMiddleware(userOptions: MiddlewarePluginOptions = {}): Plugin {
    const options = resolveOptions(userOptions);
    const ctx = new MiddlewareContext(options);

    return {
        name: "vite:uni-middleware",

        configResolved(config) {
            ctx.config = config;
        },

        configureServer({ watcher, moduleGraph, ws }) {
            const pagesJsonPath = normalizePath(resolve(ctx.config.root, options.pagesJsonPath));
            watcher.add(pagesJsonPath);

            const updateVirtualModule = () => {
                const module = moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
                if (module) {
                    moduleGraph.invalidateModule(module);
                    ws?.send({ type: "full-reload", path: "*" });
                }
            };

            watcher.on("change", (path) => {
                path = normalizePath(path);
                if (pagesJsonPath === path || path.includes(options.middlewareDir)) {
                    updateVirtualModule();
                }
            });

            watcher.on("add", (path) => {
                if (normalizePath(path).includes(options.middlewareDir)) updateVirtualModule();
            });

            watcher.on("unlink", (path) => {
                if (normalizePath(path).includes(options.middlewareDir)) updateVirtualModule();
            });
        },

        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
        },

        load(id) {
            if (id === RESOLVED_VIRTUAL_MODULE_ID) return ctx.generateVirtualModule();
        },
    };
}
