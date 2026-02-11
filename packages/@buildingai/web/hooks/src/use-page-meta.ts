/**
 * Page metadata interface for static export and runtime head management.
 */
export interface PageMeta {
    title?: string;
    path?: string;
    description?: string;
    keywords?: string;
    icon?: string;
    order?: number;
    inLinkSelector?: boolean;
}

/**
 * Define page metadata for static analysis and runtime use.
 * Export this as `meta` from your page component.
 *
 * @example
 * ```tsx
 * // pages/apps/index.tsx
 * import { definePageMeta } from "@buildingai/hooks";
 *
 * export const meta = definePageMeta({
 *   title: "应用中心",
 *   description: "管理您的应用",
 *   icon: "apps",
 *   order: 1,
 *   inLinkSelector: true,
 * });
 *
 * export default function AppsPage() { ... }
 * ```
 */
export function definePageMeta(meta: PageMeta): PageMeta {
    return meta;
}

/**
 * Extract page metadata from modules loaded via import.meta.glob.
 */
export interface PageModuleWithMeta {
    meta?: PageMeta;
    default?: unknown;
}

export interface PagePathInfo {
    path: string;
    component: string;
    label: string;
    icon?: string;
    order?: number;
    inLinkSelector?: boolean;
}

/**
 * Parse page modules from import.meta.glob and extract metadata.
 *
 * @example
 * ```tsx
 * const pageModules = import.meta.glob("/src/pages/**\/index.tsx", { eager: true });
 * const pages = parsePageModules(pageModules, {
 *   exclude: ["/console/", "/_"],
 *   basePath: "/src/pages",
 * });
 * ```
 */
export function parsePageModules(
    modules: Record<string, unknown>,
    options: {
        exclude?: string[];
        basePath?: string;
    } = {},
): PagePathInfo[] {
    const { exclude = [], basePath = "/src/pages" } = options;

    return Object.entries(modules)
        .filter(([path]) => !exclude.some((pattern) => path.includes(pattern)))
        .filter(([, module]) => !!(module as PageModuleWithMeta).meta)
        .map(([path, module]) => {
            const routePath =
                path.replace(basePath, "").replace("/index.tsx", "").replace(/\/+$/, "") || "/";
            const mod = module as PageModuleWithMeta;
            const meta = mod.meta!;

            return {
                path: meta.path || routePath,
                component: path,
                label: meta.title || routePath,
                icon: meta.icon,
                order: meta.order,
                inLinkSelector: meta.inLinkSelector ?? true,
            };
        })
        .filter((page) => page.inLinkSelector)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
