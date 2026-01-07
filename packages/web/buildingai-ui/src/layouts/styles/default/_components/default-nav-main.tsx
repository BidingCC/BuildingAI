"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronRight, EllipsisVertical, type LucideIcon, PenLine, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  id: string;
  title: string;
  path?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    id: string;
    title: string;
    path?: string;
  }[];
}

export function DefaultNavMain({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();

  const isItemActive = (path?: string) => path === pathname;
  const hasActiveChild = (items?: { path?: string }[]) =>
    items?.some((subItem) => subItem.path === pathname) ?? false;

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-1">
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            {item.items && item.items.length > 0 ? (
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={hasActiveChild(item.items)}
                    tooltip={item.title}
                    className="h-9"
                  >
                    {item.icon && <item.icon strokeWidth={hasActiveChild(item.items) ? 2.5 : 2} />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mr-0 pr-0">
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isItemActive(subItem.path)}
                          className="h-9"
                        >
                          <Link
                            to={subItem.path || ""}
                            className="flex items-center justify-between"
                          >
                            <span
                              className={cn(
                                "line-clamp-1",
                                "group-focus-within/menu-sub-item:pr-4 group-hover/menu-sub-item:pr-4",
                                {
                                  "font-bold": isItemActive(subItem.path),
                                },
                              )}
                            >
                              {subItem.title}
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                        {subItem.path && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuAction
                                showOnHover
                                className="group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-0 group-hover/menu-sub-item:opacity-100"
                              >
                                <EllipsisVertical />
                                <span className="sr-only">More</span>
                              </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem>
                                <PenLine />
                                重命名
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Trash2 />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => {
                          console.log("查看全部");
                        }}
                        className="h-9"
                      >
                        <span className="line-clamp-1 font-bold">查看全部</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={item.title}
                  className="h-9"
                  isActive={isItemActive(item.path)}
                  asChild
                >
                  <Link to={item.path || ""}>
                    {item.icon && <item.icon strokeWidth={isItemActive(item.path) ? 2.5 : 2} />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
