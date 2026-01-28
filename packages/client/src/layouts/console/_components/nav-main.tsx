"use client";

import { useAuthStore } from "@buildingai/stores";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@buildingai/ui/components/ui/hover-card";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import type { MenuItem } from "@buildingai/web-types";
import { Annoyed, ChevronRight } from "lucide-react";
// import dynamicIconImports from "lucide-react/dynamicIconImports";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

// import { LucideIcon } from "@/components/lucide-icon";

/**
 * Filter visible menu items (type !== 3 && isHidden !== 1)
 */
function filterVisibleMenus(menus: MenuItem[]): MenuItem[] {
  return menus
    .filter((menu) => menu.type !== 3 && menu.isHidden !== 1)
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterVisibleMenus(menu.children) : [],
    }));
}

/**
 * Get visible children for a menu item (type 1 or 2 with component)
 */
function getVisibleChildren(menu: MenuItem): MenuItem[] {
  if (!menu.children?.length) return [];
  return menu.children.filter(
    (child) => child.type !== 3 && child.isHidden !== 1 && (child.type === 1 || child.component),
  );
}

function NavMenuItem({ menu, basePath = "" }: { menu: MenuItem; basePath?: string }) {
  const location = useLocation();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const menuPath = basePath ? `${basePath}/${menu.path}`.replace(/\/+/g, "/") : menu.path;
  const fullPath = `/console/${menuPath}`.replace(/\/+/g, "/");
  const visibleChildren = getVisibleChildren(menu);
  const isActive = location.pathname.startsWith(fullPath);

  if (visibleChildren.length > 0) {
    if (isCollapsed) {
      return (
        <SidebarMenuItem>
          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              <SidebarMenuButton isActive={isActive}>
                {/* TODO: 这里临时注释掉动态图标 */}
                {/* <LucideIcon
                  name={menu.icon.replace("i-lucide-", "") as keyof typeof dynamicIconImports}
                /> */}
                <Annoyed />
                {/* <span>{menu.name}</span> */}
                <span>一级菜单</span>
              </SidebarMenuButton>
            </HoverCardTrigger>
            <HoverCardContent side="right" align="start" className="w-48 p-1">
              <div className="flex flex-col gap-0.5">
                {visibleChildren.map((child) => {
                  const childPath = `/console/${menuPath}/${child.path}`.replace(/\/+/g, "/");
                  const isChildActive = location.pathname === childPath;
                  return (
                    <Link
                      key={child.id}
                      to={childPath}
                      onClick={handleLinkClick}
                      className={`hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isChildActive ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      {/* {child.name} */}
                      二级菜单
                    </Link>
                  );
                })}
              </div>
            </HoverCardContent>
          </HoverCard>
        </SidebarMenuItem>
      );
    }

    return (
      <Collapsible asChild defaultOpen={isActive}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={menu.name}>
              {/* TODO: 这里临时注释掉动态图标 */}
              {/* <LucideIcon
                name={menu.icon.replace("i-lucide-", "") as keyof typeof dynamicIconImports}
              /> */}
              <Annoyed />
              {/* <span>{menu.name}</span> */}
              <span>一级菜单</span>
              <SidebarMenuAction asChild className="[[data-state=open]_>_&]:rotate-90">
                <div>
                  <ChevronRight />
                  <span className="sr-only">Toggle</span>
                </div>
              </SidebarMenuAction>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {visibleChildren.map((child) => {
                const childPath = `/console/${menuPath}/${child.path}`.replace(/\/+/g, "/");
                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton asChild isActive={location.pathname === childPath}>
                      <Link to={childPath} onClick={handleLinkClick}>
                        {/* <span>{child.name}</span> */}
                        <span>二级菜单</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={menu.name} isActive={location.pathname === fullPath}>
        <Link to={fullPath} onClick={handleLinkClick}>
          {/* TODO: 这里临时注释掉动态图标 */}
          {/* <LucideIcon
            name={menu.icon.replace("i-lucide-", "") as keyof typeof dynamicIconImports}
          /> */}
          <Annoyed />
          {/* <span>{menu.name}</span> */}
          <span>顶级菜单</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavMenuGroup({ group }: { group: MenuItem }) {
  const visibleChildren = getVisibleChildren(group);
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  if (visibleChildren.length === 0) return null;

  return (
    <SidebarGroup>
      {/* isExpanded && <SidebarGroupLabel>{group.name}</SidebarGroupLabel> */}
      {isExpanded && <SidebarGroupLabel>分组</SidebarGroupLabel>}

      <SidebarMenu>
        {visibleChildren.map((menu) => (
          <NavMenuItem key={menu.id} menu={menu} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function NavMain() {
  const { userInfo } = useAuthStore((state) => state.auth);

  const menuGroups = useMemo(() => {
    if (!userInfo?.menus) return [];
    return filterVisibleMenus(userInfo.menus);
  }, [userInfo?.menus]);

  return (
    <>
      {menuGroups.map((group) =>
        group.type === 0 ? (
          <NavMenuGroup key={group.id} group={group} />
        ) : (
          <SidebarGroup key={group.id}>
            <SidebarMenu>
              <NavMenuItem menu={group} />
            </SidebarMenu>
          </SidebarGroup>
        ),
      )}
    </>
  );
}
