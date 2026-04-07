import { useI18n } from "@buildingai/i18n";
import type { DecorateMenuItem } from "@buildingai/services/web";
import { useConversationsQuery, useDecorateMenuQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@buildingai/ui/components/ui/sidebar";
import { isEnabled } from "@buildingai/utils/is";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo } from "react";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { DefaultNavGroup } from "./default-group";
import { DefaultLogo } from "./default-logo";
import { DefaultNavMain, type NavItem } from "./default-nav-main";
import { DefaultNavUser } from "./default-nav-user";

/**
 * Keyboard shortcut component that registers a global shortcut and displays the key hint
 */
function KeyboardShortcut({
  keys,
  onTrigger,
  className,
}: {
  keys: { meta?: boolean; ctrl?: boolean; shift?: boolean; key: string };
  onTrigger: () => void;
  className?: string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const metaMatch = keys.meta ? e.metaKey : true;
      const ctrlMatch = keys.ctrl ? e.ctrlKey : true;
      const shiftMatch = keys.shift ? e.shiftKey : true;
      const keyMatch = e.key.toLowerCase() === keys.key.toLowerCase();

      if (metaMatch && ctrlMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keys, onTrigger]);

  const label = [keys.meta && "⌘", keys.ctrl && "⌃", keys.shift && "⇧", keys.key.toUpperCase()]
    .filter(Boolean)
    .join("");

  return <span className={className}>{label}</span>;
}

const MENU_HOME_FIXED = "menu_home_fixed";
const MENU_HISTORY_FIXED = "menu_history_fixed";

/**
 * Default chat component path used to identify if home page is the chat page.
 */
const DEFAULT_CHAT_COMPONENT = "/src/pages/index.tsx";

/**
 * Convert DecorateMenuItem to NavItem format used by DefaultNavMain.
 * Handles special menu_history_fixed item by injecting conversation sub-items.
 */
function useMenuItems(
  menus: DecorateMenuItem[],
  conversationItems: { id: string; title: string; path: string }[],
  homeAction?: React.ReactNode,
): NavItem[] {
  return useMemo(() => {
    return menus
      .filter((menu) => !menu.isHidden)
      .map((menu): NavItem => {
        if (menu.id === MENU_HISTORY_FIXED) {
          return {
            id: menu.id,
            title: menu.title,
            icon: menu.icon,
            isActive: true,
            items: conversationItems,
          };
        }

        return {
          id: menu.id,
          title: menu.title,
          path: menu.link.path,
          icon: menu.icon,
          target: menu.link.target,
          ...(menu.id === MENU_HOME_FIXED && homeAction ? { action: homeAction } : {}),
        };
      });
  }, [menus, conversationItems, homeAction]);
}

export function DefaultAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { data: menuConfig, isLoading: isMenuLoading } = useDecorateMenuQuery();
  const { data: conversationsData } = useConversationsQuery(
    { page: 1, pageSize: 6 },
    { refetchOnWindowFocus: false },
  );

  const conversationItems = useMemo(
    () =>
      conversationsData?.items?.map((conversation) => ({
        id: `conversation-${conversation.id}`,
        title: conversation.title || t("chat.newConversation"),
        path: `/c/${conversation.id}`,
      })) || [],
    [conversationsData],
  );

  const homeMenu = menuConfig?.menus?.find((m) => m.id === MENU_HOME_FIXED);
  const isChatHome = homeMenu?.link?.component === DEFAULT_CHAT_COMPONENT;

  const homeAction = isChatHome ? (
    <KeyboardShortcut
      keys={{ meta: true, key: "k" }}
      onTrigger={() => navigate("/")}
      className="text-muted-foreground/70 opacity-0 group-hover/link-menu-item:opacity-100"
    />
  ) : undefined;

  const navMain = useMenuItems(menuConfig?.menus ?? [], conversationItems, homeAction);

  const consoleLink = useMemo(() => {
    const menus = userInfo?.menus || [];

    let firstMenuPath: string | null = null;

    const findMenuPath = (items: typeof menus, parentPath = ""): string | null => {
      for (const item of items) {
        const currentPath = item.path
          ? [parentPath, item.path].filter(Boolean).join("/")
          : parentPath;

        if (item.type === 2 && item.path && item.path !== "#") {
          const fullPath = `/console/${currentPath}`;
          if (fullPath === "/console/dashboard") return fullPath;
          if (!firstMenuPath) firstMenuPath = fullPath;
        }

        if (item.children?.length) {
          const result = findMenuPath(item.children, currentPath);
          if (result) return result;
        }
      }
      return null;
    };

    return findMenuPath(menus) || firstMenuPath || "/console/dashboard";
  }, [userInfo?.menus]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row items-center">
        <DefaultLogo />
      </SidebarHeader>
      <SidebarContent>
        <DefaultNavMain items={navMain} isLoading={isMenuLoading} />
        {(menuConfig?.groups ?? [])
          .filter((group) => !group.isHidden)
          .map((group) => (
            <DefaultNavGroup key={group.id} group={group} />
          ))}
      </SidebarContent>
      <SidebarFooter className="in-data-[state=collapsed]:overflow-hidden">
        <SidebarMenu>
          {isEnabled(userInfo?.permissions) && (
            <SidebarMenuItem>
              <SidebarMenuButton className="h-9" asChild>
                <Link to={consoleLink}>
                  <LayoutDashboard />
                  <span className="whitespace-nowrap">{t("common.workspace")}</span>
                  <SidebarMenuAction asChild>
                    <div>
                      <ArrowUpRight />
                      <span className="sr-only">Toggle</span>
                    </div>
                  </SidebarMenuAction>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <DefaultNavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
