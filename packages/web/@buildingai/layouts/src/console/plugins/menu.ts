/**
 * Plugin Console Menu System
 * @description Type definitions and utilities for plugin console menu configuration
 */

import type { Component } from "vue";
import type { RouteMeta, RouteRecordRaw } from "vue-router";

// ==================== Type Definitions ====================

/**
 * Menu item configuration
 */
export interface PluginMenuItem {
    /** Menu name/label */
    name: string;
    /** Route path segment (relative to parent) */
    path: string;
    /** Icon name (Iconify format, e.g. "i-lucide-file") */
    icon?: string;
    /** Vue component loader (required for leaf nodes) */
    component?: () => Promise<Component>;
    /** Additional route meta data */
    meta?: RouteMeta;
    /** Display order (lower number appears first, default: 0) */
    sort?: number;
    /** Whether to hide this menu item in sidebar navigation (default: false) */
    hidden?: boolean;
    /** Active path for menu highlighting (relative to parent, e.g. "article/list") */
    activePath?: string;
    /** Child menu items for nested structure */
    children?: PluginMenuItem[];

    defaultOpen?: boolean;
}

/**
 * Navigation menu item for UI rendering
 */
export interface NavigationItem {
    /** Display label */
    label: string;
    /** Icon name */
    icon: string;
    /** Route path (only for leaf nodes with component) */
    to?: string;
    /** Active state */
    active?: boolean;
    /** Whether to expand by default */
    defaultOpen?: boolean;
    /** Child items */
    children?: NavigationItem[];
}

// ==================== Internal Utilities ====================

/**
 * Normalize path by combining parent and child paths
 * @internal
 */
function normalizePath(parent: string, child: string): string {
    return `${parent}/${child}`.replace(/\/+/g, "/");
}

/**
 * Generate route name from path
 * @internal
 */
function generateRouteName(path: string): string {
    return path.replace(/\//g, "-").replace(/^-/, "");
}

/**
 * Sort menu items by sort order
 * @internal
 */
function sortMenuItems(items: PluginMenuItem[]): PluginMenuItem[] {
    return [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/**
 * Check if path is active
 * @internal
 */
function isPathActive(currentPath: string, targetPath: string): boolean {
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

/**
 * Check if any child is active (recursive)
 * @internal
 */
function hasActiveChild(children: NavigationItem[]): boolean {
    return children.some(
        (child) => child.active || (child.children && hasActiveChild(child.children)),
    );
}

// ==================== Public API ====================

/**
 * Transform menu items to route records
 * @param menuItems - Menu configuration array
 * @param parentPath - Parent path for nested routes (default: "/console")
 * @returns Array of route records ready for vue-router
 *
 * @example
 * ```ts
 * const routes = transformMenuToRoutes([
 *   { name: "Dashboard", path: "", component: () => import("~/pages/console/index.vue") },
 *   { name: "Articles", path: "articles", children: [...] },
 * ]);
 * ```
 */
export function transformMenuToRoutes(
    menuItems: PluginMenuItem[],
    parentPath = "/console",
): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = [];
    const sortedItems = sortMenuItems(menuItems);

    for (const item of sortedItems) {
        const fullPath = normalizePath(parentPath, item.path);
        const routeName = generateRouteName(fullPath);

        // Build route meta with defaults
        const meta = {
            layout: "console",
            title: item.name,
            icon: item.icon,
            order: item.sort,
            ...item.meta,
        };

        // Process children recursively
        if (item.children?.length) {
            const childRoutes = transformMenuToRoutes(item.children, fullPath);
            routes.push(...childRoutes);

            // Directory without component → create redirect to first child
            if (!item.component && childRoutes[0]?.path) {
                routes.push({
                    name: routeName,
                    path: fullPath,
                    redirect: childRoutes[0].path,
                    meta,
                } as RouteRecordRaw);
                continue;
            }
        }

        // Add component route
        if (item.component) {
            routes.push({
                name: routeName,
                path: fullPath,
                component: item.component,
                meta,
            } as RouteRecordRaw);
        }
    }

    return routes;
}

/**
 * Transform menu items to navigation menu structure for UI rendering
 * @param menuItems - Menu configuration array
 * @param currentPath - Current active path for highlighting
 * @param parentPath - Parent path for nested routes (default: "/console")
 * @returns Navigation menu structure for sidebar/navigation components
 *
 * @example
 * ```ts
 * const navMenu = transformMenuToNavigation(consoleMenu, "/console/articles");
 * // Returns hierarchical menu with active states
 * ```
 */
export function transformMenuToNavigation(
    menuItems: PluginMenuItem[],
    currentPath: string,
    parentPath = "/console",
    rootPath = "/console",
): NavigationItem[] {
    const sortedItems = sortMenuItems(menuItems);

    const activePathMap = new Map<string, string>();
    const collectActivePathMap = (items: PluginMenuItem[], pPath: string, rPath: string) => {
        for (const item of items) {
            const fullPath = normalizePath(pPath, item.path);
            if (item.activePath) {
                activePathMap.set(fullPath, normalizePath(rPath, item.activePath));
            }
            if (item.children?.length) {
                collectActivePathMap(item.children, fullPath, rPath);
            }
        }
    };
    collectActivePathMap(menuItems, parentPath, rootPath);

    const targetActivePath = activePathMap.get(currentPath);

    return sortedItems
        .filter((item) => !item.hidden)
        .map((item) => {
            const fullPath = normalizePath(parentPath, item.path);
            let isActive = targetActivePath
                ? fullPath === targetActivePath
                : isPathActive(currentPath, fullPath);

            const navItem: NavigationItem = {
                label: item.name,
                icon: item.icon || "i-lucide-file",
                active: isActive,
                defaultOpen: item.defaultOpen,
            };

            if (item.component) {
                navItem.to = fullPath;
            }

            if (item.children?.length) {
                navItem.children = transformMenuToNavigation(
                    item.children,
                    currentPath,
                    fullPath,
                    rootPath,
                );
                if (navItem.children.length === 0) {
                    return null;
                }
                // 如果子菜单项中有被激活的，父级也应该被激活
                const hasActive = hasActiveChild(navItem.children);
                if (hasActive) {
                    isActive = true;
                    navItem.active = true;
                }
                navItem.defaultOpen = item.defaultOpen || isActive || hasActive;
            }

            return navItem;
        })
        .filter((item): item is NavigationItem => item !== null);
}
