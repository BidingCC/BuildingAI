import { ReloadWindow } from "@buildingai/ui/components/reload-windows";
import { useI18n } from "@buildingai/i18n";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@buildingai/ui/components/ui/breadcrumb";
import { Button } from "@buildingai/ui/components/ui/button";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@buildingai/ui/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { Home, RotateCcw } from "lucide-react";
import { Fragment, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { ExtensionMenuItem } from "../types";

interface BreadcrumbTrailItem {
  title: string;
  path: string;
}

/**
 * Normalize path by removing trailing slash
 */
const normalizePath = (path: string) => {
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
};

/**
 * Build a breadcrumb trail by matching the current pathname against static menus.
 */
function findBreadcrumbTrail(
  menus: ExtensionMenuItem[],
  pathname: string,
): BreadcrumbTrailItem[] | null {
  const normalizedPathname = normalizePath(pathname);

  for (const menu of menus) {
    const fullPath = normalizePath(`/console/${menu.path}`.replace(/\/+/g, "/"));

    if (normalizedPathname === fullPath) {
      return [{ title: menu.title, path: fullPath }];
    }

    if (menu.children?.length) {
      for (const child of menu.children) {
        const childPath = normalizePath(`/console/${child.path}`.replace(/\/+/g, "/"));
        if (normalizedPathname === childPath) {
          return [
            { title: menu.title, path: fullPath },
            { title: child.title, path: childPath },
          ];
        }
      }
    }
  }
  return null;
}

const AppNavbar = ({ menus }: { menus: ExtensionMenuItem[] }) => {
  const { t } = useI18n();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbItems = useMemo<BreadcrumbTrailItem[]>(() => {
    const trail = findBreadcrumbTrail(menus, location.pathname);
    return trail || [];
  }, [menus, location.pathname]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-3 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="size-fit bg-transparent p-0 hover:bg-transparent" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{state === "expanded" ? t("common.collapseSidebar") : t("common.expandSidebar")}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ReloadWindow asChild>
              <Button
                className="size-fit bg-transparent p-0 hover:bg-transparent"
                variant="ghost"
                size="icon-sm"
              >
                <RotateCcw />
              </Button>
            </ReloadWindow>
          </TooltipTrigger>
          <TooltipContent>
            <p>重新加载</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 data-vertical:h-3.5" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              const isFirstHidden = index === 0 && breadcrumbItems.length > 1;
              return (
                <Fragment key={item.path}>
                  {index >= 1 && (
                    <BreadcrumbSeparator
                      className={index === 1 && breadcrumbItems.length > 1 ? "hidden md:flex" : ""}
                    />
                  )}
                  <BreadcrumbItem className={isFirstHidden ? "hidden md:block" : ""}>
                    {isLast ? (
                      <BreadcrumbPage>{item.title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={item.path}>{item.title}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <ReloadWindow asChild>
              <Button
                className="size-fit bg-transparent p-0 hover:bg-transparent"
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate("/")}
              >
                <Home />
              </Button>
            </ReloadWindow>
          </TooltipTrigger>
          <TooltipContent>
            <p>插件首页</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};

export default AppNavbar;
