import { useAuthStore } from "@buildingai/stores";
import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Separator } from "@buildingai/ui/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronLeft, ExternalLink, FileText } from "lucide-react";
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { SidebarConfig } from "../_config/sidebar-config";

/**
 * 动态侧边栏组件属性
 */
interface DynamicSidebarProps extends React.ComponentProps<typeof Sidebar> {
  /** 侧边栏配置 */
  config: SidebarConfig;
  /** 基础路径（用于拼接菜单项路径） */
  basePath: string;
}

/**
 * 营销工具通用侧边栏组件
 * 支持通过配置动态渲染侧边栏内容
 */
export function OperationSidebar({ config, basePath, ...props }: DynamicSidebarProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useAuthStore((state) => state.auth);

  const visibleMenuItems = React.useMemo(() => {
    const userPermissions = userInfo?.permissionsCodes ?? [];
    const isRoot = !!userInfo?.isRoot;

    return config.menuItems.filter((item) => {
      if (isRoot) {
        return true;
      }

      const permissions = Array.isArray(item.permissions) ? item.permissions : [item.permissions];
      return permissions.some((permission) => userPermissions.includes(permission));
    });
  }, [config.menuItems, userInfo?.isRoot, userInfo?.permissionsCodes]);

  return (
    <Sidebar collapsible="icon" {...props} className="bg-sidebar rounded-r-lg border-r-0! p-2">
      <SidebarHeader className="group/header hover:bg-muted-foreground/10 rounded-lg px-2 py-3 transition-colors">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(config.backPath)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        <div className="mt-2 flex flex-col items-start gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{t(config.title)}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs">{t(config.description)}</span>
          </div>
        </div>
      </SidebarHeader>
      <Separator className="my-4" />
      <SidebarContent>
        <SidebarMenu>
          {visibleMenuItems.map((item) => {
            const fullPath = `${basePath}/${item.path}`;
            const isActive = location.pathname === fullPath;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild className="h-10">
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-primary/10 text-primary",
                    )}
                    onClick={() => navigate(fullPath)}
                  >
                    <item.icon />
                    <span className="whitespace-nowrap">{t(item.label)}</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9" asChild>
              <Link to="/console/dashboard">
                <FileText />
                <span className="whitespace-nowrap">{t("common.documentation")}</span>
                <SidebarMenuAction asChild>
                  <div>
                    <ExternalLink />
                    <span className="sr-only">Toggle</span>
                  </div>
                </SidebarMenuAction>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
