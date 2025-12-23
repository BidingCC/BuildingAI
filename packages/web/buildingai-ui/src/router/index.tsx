import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";

import ErrorPage from "../components/exception/error-page";
import NotFoundPage from "../components/exception/not-found-page";
import AuthGuard from "../components/guard/auth-guard";
import ConsoleLayout from "../layouts/console";
import MainLayout from "../layouts/main";
import IndexPage from "../pages";
import { LoginPage } from "../pages/login";

export interface MenuRoute {
  path: string;
  component: string;
  children?: MenuRoute[];
}

const modules = import.meta.glob<{ default: ComponentType }>(
  ["@/pages/console/**/*.tsx", "!@/pages/console/**/_components/**"],
  { eager: true },
);

/**
 * Convert menu routes from API to react-router RouteObject.
 */
function generateRoutes(menuRoutes: MenuRoute[]): RouteObject[] {
  return menuRoutes.map((route) => {
    const module = modules[`/src/pages${route.component}`];
    const Component = module?.default;

    const routeObject: RouteObject = {
      path: route.path,
      element: Component ? <Component /> : null,
    };

    if (route.children?.length) {
      routeObject.children = generateRoutes(route.children);
    }

    return routeObject;
  });
}

function createRoutes(dynamicRoutes: RouteObject[] = []): ReturnType<typeof createBrowserRouter> {
  return createBrowserRouter([
    {
      element: <MainLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          element: <IndexPage />,
        },
        {
          path: "/login",
          element: <LoginPage />,
        },
        {
          element: <AuthGuard />,
          children: [
            {
              path: "/console",
              element: <ConsoleLayout />,
              children: dynamicRoutes,
            },
          ],
        },
        {
          path: "*",
          element: <NotFoundPage />,
        },
      ],
    },
  ]);
}

export { createRoutes, generateRoutes };
