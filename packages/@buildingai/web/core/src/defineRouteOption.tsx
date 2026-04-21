import AuthGuard from "@buildingai/ui/components/auth/auth-guard";
import GlobalError from "@buildingai/ui/components/exception/global-error";
import NotFoundPage from "@buildingai/ui/components/exception/not-found-page";
import ExtensionConsoleLayout from "@buildingai/ui/layouts/extension/console/index";
import type { ExtensionMenuItem } from "@buildingai/ui/layouts/extension/console/types";
import { useEffect, useRef } from "react";
import {
    createBrowserRouter,
    Outlet,
    type RouteObject,
    useLocation,
    useNavigate,
} from "react-router-dom";

export type RouteOption = {
    base: string;
    routes?: RouteObject[];
    /** Routes placed inside the console layout (admin pages) */
    consoleRoutes?: RouteObject[];
    /** Static menu items rendered in the console sidebar */
    consoleMenus?: ExtensionMenuItem[];
    /** Extension identifier for fetching extension details */
    identifier?: string;
};

/**
 * Syncs extension iframe route changes with the parent window.
 * - Extension → Parent: posts navigation message on route change
 * - Parent → Extension: listens for navigation commands from parent
 */
function ParentFrameSync() {
    const location = useLocation();
    const navigate = useNavigate();
    const isParentNavigatingRef = useRef(false);

    // Extension → Parent: notify parent of route changes
    useEffect(() => {
        if (window.parent === window) return;
        if (isParentNavigatingRef.current) {
            isParentNavigatingRef.current = false;
            return;
        }

        window.parent.postMessage(
            {
                type: "extension-navigate",
                path: location.pathname,
                search: location.search,
                hash: location.hash,
            },
            "*",
        );
    }, [location.pathname, location.search, location.hash]);

    // Parent → Extension: handle browser back/forward from parent
    useEffect(() => {
        if (window.parent === window) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== "parent-navigate") return;

            const path = event.data.path ?? "/";
            const search = event.data.search ?? "";
            const hash = event.data.hash ?? "";
            const target = `${path}${search}${hash}`;
            const current = `${location.pathname}${location.search}${location.hash}`;

            if (target !== current) {
                isParentNavigatingRef.current = true;
                navigate(target, { replace: true });
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [location.pathname, location.search, location.hash, navigate]);

    return <Outlet />;
}

function ExtensionNotFoundPage() {
    const location = useLocation();

    useEffect(() => {
        if (window.parent === window) return;

        window.parent.postMessage(
            {
                type: "extension-not-found",
                path: location.pathname,
                search: location.search,
                hash: location.hash,
            },
            "*",
        );
    }, [location.pathname, location.search, location.hash]);

    return <NotFoundPage />;
}

/**
 * Build a standard application router from a simplified route option.
 * Encapsulates the common route skeleton so each project only needs
 * to provide its own pages, guards, and business routes.
 */
export function defineRouteOption(option: RouteOption) {
    const { routes = [], consoleRoutes = [], consoleMenus = [], identifier } = option;

    return createBrowserRouter(
        [
            {
                element: <ParentFrameSync />,
                errorElement: <GlobalError />,
                children: [
                    ...routes,
                    {
                        element: <AuthGuard />,
                        children: [
                            {
                                path: "/console/*",
                                element: (
                                    <ExtensionConsoleLayout
                                        menus={consoleMenus}
                                        identifier={identifier}
                                    />
                                ),
                                errorElement: (
                                    <ExtensionConsoleLayout
                                        menus={consoleMenus}
                                        identifier={identifier}
                                    >
                                        <GlobalError />
                                    </ExtensionConsoleLayout>
                                ),
                                children: consoleRoutes,
                            },
                        ],
                    },
                    {
                        path: "*",
                        element: <ExtensionNotFoundPage />,
                    },
                ],
            },
        ],
        {
            basename: option.base,
        },
    );
}
