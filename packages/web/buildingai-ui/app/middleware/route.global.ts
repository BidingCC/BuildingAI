import { ROUTES } from "@buildingai/constants/web";
import { useAppStore } from "@buildingai/stores/app";
import { usePermissionStore } from "@buildingai/stores/permission";
import { useUserStore } from "@buildingai/stores/user";

import { buildRoutes } from "@/utils/menu-helper";

const modules = import.meta.glob(["@/pages/console/**/*.vue"], { eager: false });

export default defineNuxtRouteMiddleware(async (to, from) => {
    const router = useRouter();
    const appStore = useAppStore();
    const userStore = useUserStore();
    const permissionStore = usePermissionStore();

    /**
     * Check if path matches console menu route
     */
    const isConsoleMenuMatched = (path: string) =>
        router.resolve(path).matched.some((r) => r.path.startsWith(ROUTES.CONSOLE));

    /**
     * Check if the path is a login page (main app or extension)
     * @param path - The path to check
     * @returns true if the path is a login page
     */
    const isLoginPage = (path: string | undefined): boolean => {
        if (!path) return false;
        // Remove query string and hash for comparison
        const cleanPath = path.split("?")[0]?.split("#")[0];
        if (!cleanPath) return false;

        // Main app login page: /login
        if (cleanPath === ROUTES.LOGIN || cleanPath === `${ROUTES.LOGIN}/`) {
            return true;
        }
        // Extension login page: /extension/{identifier}/login
        if (cleanPath.startsWith(`${ROUTES.APP}/`)) {
            const pathParts = cleanPath.replace(`${ROUTES.APP}/`, "").split("/").filter(Boolean);
            // Check if the path ends with /login
            return pathParts.length >= 2 && pathParts[pathParts.length - 1] === "login";
        }
        return false;
    };

    // Handle extension routes
    if (to.path.startsWith(`${ROUTES.APP}/`)) {
        // Extract extension identifier from path
        // Format: /extensions/{identifier} or /extensions/{identifier}/console/...
        const pathParts = to.path.replace(`${ROUTES.APP}/`, "").split("/");

        // If accessing extension console routes (extensions/xxx/console/...)
        if (pathParts[1] === "console") {
            // Set extension layout for extension console pages
            setPageLayout("extension");
            to.meta.auth = true;
        } else {
            // For extensions/xxx routes, use default layout and route to extensions/[id].vue
            // No need to set layout explicitly, will use default
        }
    }

    /**
     * Basic authentication and redirect logic
     * - Set page layout
     * - Get user information
     * - Handle login/logout redirects
     * - Refresh token when logged in
     * @returns string | undefined
     */
    const handleAuth = async () => {
        // Check if accessing login page (main app or extension) - must be checked first
        const isGuestPage = to.meta.guest === true || isLoginPage(to.path);
        if (userStore.isLogin && isGuestPage) {
            // If coming from a non-login page, redirect back to that page
            // Otherwise redirect to home
            const fromIsGuestPage = from.meta.guest === true || isLoginPage(from.path);
            return !fromIsGuestPage && from.path !== to.path ? from.fullPath : ROUTES.HOME;
        }

        // All console pages must use console layout and require authentication
        if (to.fullPath.startsWith(ROUTES.CONSOLE)) {
            setPageLayout(to.meta.layout || "console");
            to.meta.auth = true;
        }

        // Logged in but no user info → fetch user info
        if (userStore.isLogin && !userStore.userInfo) {
            await userStore.getUser();
        }
        // Not logged in and target page requires auth → redirect to login
        else if (!userStore.isLogin && to.meta.auth !== false && !isGuestPage) {
            setPageLayout("full-screen");
            return `${ROUTES.LOGIN}?redirect=${to.fullPath}`;
        }
        // Logged in accessing other pages → refresh token
        else if (userStore.isLogin) {
            userStore.refreshToken();
        }
    };

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
    // 2. Login and redirect control
    // =============================================
    const authRedirect = await handleAuth();
    if (authRedirect) return authRedirect;

    // =============================================
    // 3. Console menu matching pre-check
    //    If menus loaded and console route matched → allow
    //    Or if target is not console route → allow
    // =============================================
    if (
        (permissionStore.menus?.length && isConsoleMenuMatched(to.fullPath)) ||
        !to.fullPath.startsWith(ROUTES.CONSOLE)
    ) {
        return;
    }

    try {
        // =============================================
        // 4. Load permissions and register console routes
        // =============================================
        await permissionStore.loadPermissions();

        // Non-admin with no permissions → 403
        if (userStore.userInfo?.isRoot === 0 && permissionStore.permissions.length === 0) {
            return ROUTES.FORBIDDEN;
        }

        // Build and register console routes
        const routes = buildRoutes(
            permissionStore.menus,
            userStore.userInfo?.isRoot === 1,
            modules,
        );

        routes.forEach((route) => {
            try {
                router.addRoute(route);
            } catch (error) {
                console.error(`Failed to add route ${route.path}:`, error);
            }
        });

        // Permission check: no corresponding permission → 403
        if (
            userStore.userInfo?.isRoot === 0 &&
            to.meta.permissionCode &&
            !permissionStore.hasPermission(to.meta.permissionCode as string)
        ) {
            return ROUTES.FORBIDDEN;
        }

        // Console home → redirect to first accessible route
        if (to.fullPath === ROUTES.CONSOLE || to.fullPath === `${ROUTES.CONSOLE}/`) {
            return routes[0]?.path || ROUTES.HOME;
        }

        // =============================================
        // 5. Match again after registration
        // =============================================
        if (!isConsoleMenuMatched(to.fullPath)) {
            console.warn(`Route not found: ${to.path}`);
            setPageLayout("full-screen");
            return "/not-found";
        }

        // Match successful → allow
        return to.fullPath;
    } catch (error) {
        console.log("Failed to register routes:", error);
        // API request error → 404
        if (error instanceof Error && error.name === "FetchError") {
            return "/not-found";
        }
        return to.fullPath;
    }
});
