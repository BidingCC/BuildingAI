/**
 * Router Options
 * @description Custom router configuration for plugin
 * @see https://nuxt.com/docs/4.x/guide/recipes/custom-routing#using-routeroptions
 */

import type { PluginMenuItem } from "@buildingai/layouts/console/menu";
import { defineRoutesConfig } from "@buildingai/nuxt/router";

/**
 * Console menu configuration
 * @description Define menu structure - supports nested items
 */
export const consoleMenu: PluginMenuItem[] = [
    {
        name: "文章管理",
        path: "article",
        // icons: https://icones.js.org/collection/lucide
        icon: "i-lucide-file-text",
        defaultOpen: true,
        children: [
            {
                name: "列表",
                path: "list",
                icon: "i-lucide-list",
                component: () => import("~/pages/console/article/list.vue"),
                sort: 1,
            },
            {
                name: "添加文章",
                path: "add",
                icon: "i-lucide-plus",
                hidden: true,
                component: () => import("~/pages/console/article/add.vue"),
                sort: 2,
                activePath: "article/list",
            },
            {
                name: "Edit Article",
                path: "edit",
                icon: "i-lucide-pencil",
                hidden: true,
                component: () => import("~/pages/console/article/edit.vue"),
                sort: 6,
                activePath: "article/list",
            },
        ],
    },
    {
        name: "文章栏目",
        path: "column",
        icon: "i-lucide-list",
        sort: 3,
        component: () => import("~/pages/console/column/list.vue"),
    },
];

export default defineRoutesConfig(consoleMenu);
