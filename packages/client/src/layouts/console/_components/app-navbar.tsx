import { useI18n } from "@buildingai/i18n";
import { useAuthStore } from "@buildingai/stores";
import { ReloadWindow } from "@buildingai/ui/components/reload-windows";
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
import type { MenuItem } from "@buildingai/web-types";
import { RotateCcw } from "lucide-react";
import { Fragment, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

interface BreadcrumbTrailItem {
  name: string;
  path: string;
  type: number;
  code: string;
}

/**
 * Find matching menu items for current path and build breadcrumb trail
 */
function findBreadcrumbTrail(
  menus: MenuItem[],
  pathname: string,
  basePath = "",
  trail: BreadcrumbTrailItem[] = [],
): BreadcrumbTrailItem[] | null {
  for (const menu of menus) {
    const menuPath = basePath ? `${basePath}/${menu.path}`.replace(/\/+/g, "/") : menu.path;
    const fullPath = `/console/${menuPath}`.replace(/\/+/g, "/");

    const currentTrail = [...trail, { name: menu.name, path: fullPath, type: menu.type, code: menu.code }];

    if (pathname === fullPath) {
      return currentTrail;
    }

    if (menu.children?.length) {
      const childResult = findBreadcrumbTrail(menu.children, pathname, menuPath, currentTrail);
      if (childResult) {
        return childResult;
      }
    }
  }
  return null;
}

const AppNavbar = () => {
  const { t } = useI18n();
  const { state } = useSidebar();
  const location = useLocation();
  const { userInfo } = useAuthStore((state) => state.auth);

  const breadcrumbItems = useMemo<BreadcrumbTrailItem[]>(() => {
    if (!userInfo?.menus) return [];
    const trail = findBreadcrumbTrail(userInfo.menus, location.pathname);
    return (trail || []).map((item) => ({
      ...item,
      name: item.name, // Could translate via sidebar code if needed
    }));
  }, [userInfo?.menus, location.pathname]);

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
            <p>{t("common.reload")}</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 data-vertical:h-3.5" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              const isClickable = item.type === 2;
              const isFirstHidden = index === 0 && breadcrumbItems.length > 1;

              return (
                <Fragment key={item.path}>
                  {index >= 1 && (
                    <BreadcrumbSeparator
                      className={index === 1 && breadcrumbItems.length > 1 ? "hidden md:flex" : ""}
                    />
                  )}
                  <BreadcrumbItem className={isFirstHidden ? "hidden md:block" : ""}>
                    {isLast || !isClickable ? (
                      <BreadcrumbPage>{t(`sidebar.${item.code}`)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={item.path}>{t(`sidebar.${item.code}`)}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
};

export default AppNavbar;
