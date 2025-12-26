import { useAuthStore } from "@buildingai/stores";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import type { MenuItem } from "@buildingai/web-types";
import type { ComponentType } from "react";
import { useMemo } from "react";
import type { RouteObject } from "react-router-dom";
import { useRoutes } from "react-router-dom";

import NotFoundPage from "../../components/exception/not-found-page";
import AppNavbar from "./_components/app-navbar";
import { AppSidebar } from "./_components/app-sidebar";

const modules = import.meta.glob<{ default: ComponentType }>(
  ["@/pages/console/**/*.tsx", "!@/pages/console/**/_components/**"],
  { eager: true },
);

/**
 * Convert menu items to react-router RouteObject.
 */
function generateRoutes(menus: MenuItem[]): RouteObject[] {
  return menus
    .filter((menu) => menu.component)
    .flatMap((menu) => {
      const module = modules[`/src/pages${menu.component}`];
      const Component = module?.default;

      const routes: RouteObject[] = [];

      if (Component) {
        routes.push({
          path: menu.path,
          element: <Component />,
        });
      }

      if (menu.children?.length) {
        routes.push(...generateRoutes(menu.children));
      }

      return routes;
    });
}

function ConsoleRoutes() {
  const { userInfo } = useAuthStore((state) => state.auth);

  const routes = useMemo<RouteObject[]>(() => {
    const dynamicRoutes = generateRoutes(userInfo?.menus ?? []);
    return [...dynamicRoutes, { path: "*", element: <NotFoundPage /> }];
  }, [userInfo?.menus]);
  console.log(userInfo?.menus);
  console.log(routes);

  return useRoutes(routes);
}

export default function ConsoleLayout() {
  return (
    <SidebarProvider className="h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppNavbar />
        <ScrollArea className="flex-1 overflow-y-auto p-4 pt-0">
          <ConsoleRoutes />
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
