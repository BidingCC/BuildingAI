import { resolve } from "node:path";

import { defineNuxtModule, extendPages } from "@nuxt/kit";

/**
 * Shared page configuration
 */
interface SharedPageConfig {
    name: string;
    path: string;
    file: string;
    meta: { layout: string; auth: boolean };
    customDir?: boolean; // 标记为从自定义目录读取
}

const SHARED_PAGES: SharedPageConfig[] = [
    {
        name: "agreement",
        path: "/agreement",
        file: "agreement/index.vue",
        meta: { layout: "full-screen", auth: false },
    },
    {
        name: "login",
        path: "/login",
        file: "login/index.vue",
        meta: { layout: "full-screen", auth: false },
    },
    {
        name: "403",
        path: "/403",
        file: "403.vue",
        meta: { layout: "full-screen", auth: false },
    },
    {
        name: "buildingai-middleware",
        path: "/buildingai-middleware",
        file: "middleware.vue",
        meta: { layout: "full-screen", auth: false },
        customDir: true,
    },
];

export default defineNuxtModule({
    meta: {
        name: "buildingai-pages",
        configKey: "buildingaiPages",
    },
    async setup(options, nuxt) {
        const rootDir = nuxt.options.rootDir;
        const isPlugin = rootDir.includes("/extensions/");

        if (isPlugin) {
            const workspaceDir = nuxt.options.workspaceDir || rootDir;
            const mainAppPagesDir = resolve(workspaceDir, "packages/web/buildingai-ui/app/pages");
            const nuxtSrcDir = resolve(workspaceDir, "packages/web/@buildingai/nuxt/src");

            extendPages((pages) => {
                SHARED_PAGES.forEach((sharedPage) => {
                    // 如果标记了 customDir，从 nuxt/src 目录读取，否则从 pages 目录读取
                    const baseDir = sharedPage.customDir ? nuxtSrcDir : mainAppPagesDir;
                    const fullPath = resolve(baseDir, sharedPage.file);

                    const existingPage = pages.find((p) => p.path === sharedPage.path);

                    if (!existingPage) {
                        pages.push({
                            name: sharedPage.name,
                            path: sharedPage.path,
                            file: fullPath,
                            meta: sharedPage.meta,
                        });
                    }
                });
            });
        }
    },
});
