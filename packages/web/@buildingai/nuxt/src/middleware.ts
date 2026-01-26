/**
 * Route Middleware Utilities
 * @description Utilities for defining route middleware with default authentication logic
 */

import { ROUTES } from "@buildingai/constants/web";
import { AnalyseActionType, apiRecordAnalyse } from "@buildingai/service/common";
import { useAppStore } from "@buildingai/stores/app";
import { usePermissionStore } from "@buildingai/stores/permission";
import { useUserStore } from "@buildingai/stores/user";
import type { RouteLocationNormalized, RouteLocationNormalizedLoaded } from "vue-router";

/**
 * Options for defining route middleware
 */
export interface DefineRouteMiddlewareOptions {
    /**
     * Custom authentication handler
     * @param to - Target route
     * @param from - Source route
     * @param userStore - User store instance
     * @returns Redirect path or undefined
     */
    handleAuth?: (
        to: RouteLocationNormalized,
        from: RouteLocationNormalizedLoaded,
        userStore: ReturnType<typeof useUserStore>,
    ) => Promise<string | void> | string | void;

    /**
     * Custom middleware handler (runs after authentication)
     * @param to - Target route
     * @param from - Source route
     * @param userStore - User store instance
     * @returns Redirect path or undefined
     */
    handleMiddleware?: (
        to: RouteLocationNormalized,
        from: RouteLocationNormalizedLoaded,
        userStore: ReturnType<typeof useUserStore>,
    ) => Promise<string | void> | string | void;
}

export function recordPluginUse(path: string, pluginName: string) {
    try {
        apiRecordAnalyse({
            actionType: AnalyseActionType.PLUGIN_USE,
            source: path,
            extraData: {
                plugin: pluginName,
                referrer: document.referrer || null,
                timestamp: Date.now(),
            },
        });
    } catch (error) {
        console.error("Record plugin use failed:", error);
    }
}

export function enableExtensionUrlSync(): void {
    if (typeof window === "undefined" || !import.meta.client) {
        return;
    }

    try {
        if (window.self === window.top) {
            return;
        }
    } catch {
        // Cross-origin iframe
    }

    const pathMatch = window.location.pathname.match(/^\/extension\/([^/]+)/);
    if (!pathMatch) {
        return;
    }

    const extensionId = pathMatch[1];

    const syncUrl = () => {
        try {
            const currentPath = window.location.pathname;
            const internalPath = currentPath
                .replace(`/extension/${extensionId}`, "")
                .replace(/^\/+/, "");

            window.parent.postMessage(
                {
                    type: "extension-navigation",
                    path: internalPath,
                },
                "*",
            );
        } catch {
            // Ignore errors
        }
    };

    const route = useRoute();
    watch(
        () => route.path,
        () => {
            syncUrl();
        },
    );

    nextTick(() => {
        syncUrl();
    });
}

/**
 * Default authentication handler
 * @param to - Target route
 * @param from - Source route
 * @param userStore - User store instance
 * @returns Redirect path or undefined
 */
async function defaultHandleAuth(
    to: RouteLocationNormalized,
    from: RouteLocationNormalizedLoaded,
    userStore: ReturnType<typeof useUserStore>,
): Promise<string | void> {
    // If logged in but no user info → fetch user info
    if (userStore.isLogin && !userStore.userInfo) {
        await userStore.getUser();
    }
    // If not logged in and page requires auth → redirect to login
    else if (!userStore.isLogin && to.meta.auth !== false && to.path !== ROUTES.LOGIN) {
        setPageLayout("full-screen");
        return `${ROUTES.LOGIN}?redirect=${to.fullPath}`;
    }
    // If logged in but accessing login page → redirect to referrer or home
    else if (userStore.isLogin && to.path === ROUTES.LOGIN) {
        return from.path !== ROUTES.LOGIN ? from.fullPath : ROUTES.HOME;
    }
    // If logged in and accessing other pages → refresh token duration
    else if (userStore.isLogin) {
        userStore.refreshToken();
    }
}

/**
 * Define BuildingAI route middleware
 * @description Create a route middleware with default authentication logic and optional custom handlers
 * @param options - Middleware configuration options
 * @returns Route middleware function
 *
 * @example
 * ```ts
 * // middleware/route.global.ts
 * import { defineBuildingAIRouteMiddleware } from "@buildingai/nuxt/middleware";
 *
 * export default defineBuildingAIRouteMiddleware();
 * ```
 *
 * @example
 * ```ts
 * // With custom authentication handler
 * import { defineBuildingAIRouteMiddleware } from "@buildingai/nuxt/middleware";
 *
 * export default defineBuildingAIRouteMiddleware({
 *   handleAuth: async (to, from, userStore) => {
 *     // Custom auth logic
 *     if (to.path === "/special") {
 *       return "/redirect";
 *     }
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // With custom middleware handler
 * import { defineBuildingAIRouteMiddleware } from "@buildingai/nuxt/middleware";
 *
 * export default defineBuildingAIRouteMiddleware({
 *   handleMiddleware: async (to, from, userStore) => {
 *     // Additional middleware logic after auth
 *     if (to.meta.requiresSpecialCheck) {
 *       // Do something
 *     }
 *   },
 * });
 * ```
 */
export function defineBuildingAIRouteMiddleware(
    options: DefineRouteMiddlewareOptions = {},
): ReturnType<typeof defineNuxtRouteMiddleware> {
    const { handleAuth = defaultHandleAuth, handleMiddleware } = options;

    return defineNuxtRouteMiddleware(async (to, from) => {
        const appStore = useAppStore();
        const permissionStore = usePermissionStore();
        const userStore = useUserStore();

        if (
            process.env.NODE_ENV === "production" &&
            !to.path.includes("/console") &&
            !to.path.includes("/buildingai-middleware")
        ) {
            console.log("enableExtensionUrlSync", to.path);
            enableExtensionUrlSync();
            setPageLayout("full-screen");
        }

        // =============================================
        // 1. Check system initialization status
        // =============================================
        try {
            const initRedirect = await appStore.checkSystemInitialization(to.path);
            if (initRedirect) return initRedirect;
        } catch (error) {
            // If API call fails, it might be because system is not initialized or network issue
            console.error("Failed to check system initialization:", error);
            throw createError({
                statusCode: 404,
                statusMessage: "System not Connected",
                fatal: true,
            });
        }

        // =============================================
        // 2. Authentication and Redirect Control
        // =============================================
        const authRedirect = await handleAuth(to, from, userStore);
        if (authRedirect) return authRedirect;

        // =============================================
        // 2.1 Console permission guard
        //    - Load permissions lazily
        //    - Non-root users without permissions → 403
        //    - Permission-specific routes enforce meta.permissionCode
        // =============================================
        if (to.path.startsWith(ROUTES.CONSOLE)) {
            try {
                if (!permissionStore.permissions?.length) {
                    await permissionStore.loadPermissions();
                }
            } catch (error) {
                console.error("Failed to load permissions:", error);
                return ROUTES.FORBIDDEN;
            }

            const isNonRootUser = userStore.userInfo?.isRoot === 0;
            const lacksAnyPermission = !permissionStore.permissions?.length;
            const requiresSpecificPermission = Boolean(to.meta.permissionCode);
            const hasRequiredPermission = requiresSpecificPermission
                ? permissionStore.hasPermission(String(to.meta.permissionCode))
                : true;

            if (isNonRootUser && (lacksAnyPermission || !hasRequiredPermission)) {
                return ROUTES.FORBIDDEN;
            }
        }

        // =============================================
        // 2.5. Handle buildingai-middleware redirect
        // =============================================
        if (to.path.startsWith(ROUTES.BUILDINGAI_MIDDLEWARE) || to.path === ROUTES.CONSOLE) {
            const router = useRouter();
            // Get all registered routes
            const allRoutes = router.getRoutes();
            // Find all routes starting with /console/, excluding /console itself
            const consoleRoutes = allRoutes
                .filter((route) => {
                    const path = route.path;
                    return path.startsWith(ROUTES.CONSOLE);
                })
                .sort((a, b) => {
                    // Sort by meta.order, with 0 being the highest priority (comes first)
                    const orderA = (a.meta?.order as number) ?? Number.MAX_SAFE_INTEGER;
                    const orderB = (b.meta?.order as number) ?? Number.MAX_SAFE_INTEGER;

                    // If order is 0, treat it as the highest priority (smallest number)
                    const normalizedOrderA = orderA === 0 ? -1 : orderA;
                    const normalizedOrderB = orderB === 0 ? -1 : orderB;

                    // Sort in ascending order (smaller order values come first)
                    if (normalizedOrderA !== normalizedOrderB) {
                        return normalizedOrderA - normalizedOrderB;
                    }

                    // If orders are equal, fall back to path sorting
                    return a.path.localeCompare(b.path);
                });

            // If console routes found, redirect to the first one
            if (consoleRoutes.length > 0 && consoleRoutes[0]) {
                return consoleRoutes[0].path;
            }

            // If no console routes found, redirect to console home
            return ROUTES.CONSOLE;
        }

        // =============================================
        // 3. Custom Middleware Handler (if provided)
        // =============================================
        if (handleMiddleware) {
            const middlewareRedirect = await handleMiddleware(to, from, userStore);
            if (middlewareRedirect) return middlewareRedirect;
        }
    });
}
