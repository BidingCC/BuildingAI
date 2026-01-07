"use client";

import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@buildingai/ui/components/ui/command";
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
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  EllipsisVertical,
  type LucideIcon,
  PenLine,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavSubItem {
  id: string;
  title: string;
  path?: string;
}

interface NavItem {
  id: string;
  title: string;
  path?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  action?: React.ReactNode;
  items?: NavSubItem[];
}

/**
 * CommandItem with delete confirmation
 */
function HistoryCommandItem({
  id,
  title,
  time,
  onDelete,
  onRename,
}: {
  id: string;
  title: string;
  time: string;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  }, []);

  const handleConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(id);
      setShowConfirm(false);
    },
    [id, onDelete],
  );

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  }, []);

  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRename(id);
    },
    [id, onRename],
  );

  return (
    <CommandItem className="h-9">
      <span>{title}</span>
      <CommandShortcut>
        {showConfirm ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="hover:bg-muted-foreground/10 size-6"
              onClick={handleCancel}
            >
              <X className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              className="hover:bg-muted-foreground/10 size-6"
              onClick={handleConfirm}
            >
              <Check className="size-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <span className="block group-hover/command-item:hidden">{time}</span>
            <div className="hidden gap-1 group-hover/command-item:flex">
              <Button
                variant="ghost"
                className="hover:bg-muted-foreground/10 size-6"
                onClick={handleRename}
              >
                <PenLine className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                className="hover:bg-muted-foreground/10 size-6"
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </CommandShortcut>
    </CommandItem>
  );
}

/**
 * Chat history menu item with special behavior:
 * - Click button opens CommandDialog
 * - Click icon toggles collapsible
 * - Shows "查看全部" at the bottom of sub-items
 */
function ChatHistoryMenuItem({
  item,
  isActive,
  onOpenDialog,
}: {
  item: NavItem;
  isActive: boolean;
  onOpenDialog: () => void;
}) {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const isItemActive = (path?: string) => path === pathname;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        className="group/history-chat-icon h-9"
        onClick={onOpenDialog}
      >
        {item.icon && (
          <>
            {state === "expanded" ? (
              <CollapsibleTrigger asChild>
                <SidebarMenuAction
                  className="center hover:bg-sidebar-accent-foreground/5 right-auto left-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <item.icon
                    className="block group-hover/history-chat-icon:hidden"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <ChevronRight className="hidden transition-transform duration-200 group-hover/history-chat-icon:block group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuAction>
              </CollapsibleTrigger>
            ) : (
              <item.icon strokeWidth={isActive ? 2.5 : 2} />
            )}
          </>
        )}
        <span
          className={cn("line-clamp-1 whitespace-nowrap", {
            "font-medium": isActive,
            "ml-6": state === "expanded",
          })}
        >
          {item.title}
        </span>
      </SidebarMenuButton>
      <CollapsibleContent>
        <SidebarMenuSub className="mr-0 pr-0">
          {item.items?.map((subItem) => (
            <SidebarMenuSubItem key={subItem.id}>
              <SidebarMenuSubButton asChild isActive={isItemActive(subItem.path)} className="h-9">
                <Link to={subItem.path || ""} className="flex items-center justify-between">
                  <span
                    className={cn(
                      "line-clamp-1",
                      "group-focus-within/menu-sub-item:pr-4 group-hover/menu-sub-item:pr-4",
                      { "font-bold": isItemActive(subItem.path) },
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
                      className="group-hover/menu-sub-item:opacity-100 md:group-focus-within/menu-item:opacity-0 md:group-hover/menu-item:opacity-0"
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
            <SidebarMenuSubButton onClick={onOpenDialog} className="h-9 cursor-pointer">
              <span className="text-muted-foreground line-clamp-1 text-xs">查看全部</span>
              <SidebarMenuAction showOnHover>
                <ArrowUpRight className="text-muted-foreground size-3" />
              </SidebarMenuAction>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      </CollapsibleContent>
    </SidebarMenuItem>
  );
}

/**
 * Collapsible menu item with sub-items
 */
function CollapsibleMenuItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { pathname } = useLocation();
  const isItemActive = (path?: string) => path === pathname;

  return (
    <SidebarMenuItem>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton isActive={isActive} tooltip={item.title} className="h-9">
          {item.icon && <item.icon strokeWidth={isActive ? 2.5 : 2} />}
          <span>{item.title}</span>
          <SidebarMenuAction>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuAction>
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mr-0 pr-0">
          {item.items?.map((subItem) => (
            <SidebarMenuSubItem key={subItem.id}>
              <SidebarMenuSubButton asChild isActive={isItemActive(subItem.path)} className="h-9">
                <Link to={subItem.path || ""} className="flex items-center justify-between">
                  <span className={cn("line-clamp-1", { "font-bold": isItemActive(subItem.path) })}>
                    {subItem.title}
                  </span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </SidebarMenuItem>
  );
}

/**
 * Simple link menu item without sub-items
 */
function LinkMenuItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        className="group/link-menu-item h-9"
        isActive={isActive}
        asChild
      >
        <Link to={item.path || ""}>
          {item.icon && <item.icon className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />}
          <span className="mr-auto flex-1 whitespace-nowrap">{item.title}</span>
          {item.action}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function DefaultNavMain({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isItemActive = (path?: string) => path === pathname;
  const hasActiveChild = (items?: NavSubItem[]) =>
    items?.some((subItem) => subItem.path === pathname) ?? false;

  const renderMenuItem = (item: NavItem) => {
    const hasItems = item.items && item.items.length > 0;
    const isChatHistory = item.id === "chat-history";

    if (isChatHistory) {
      return (
        <ChatHistoryMenuItem
          item={item}
          isActive={hasActiveChild(item.items)}
          onOpenDialog={() => setOpen(true)}
        />
      );
    }

    if (hasItems) {
      return <CollapsibleMenuItem item={item} isActive={hasActiveChild(item.items)} />;
    }

    return <LinkMenuItem item={item} isActive={isItemActive(item.path)} />;
  };

  return (
    <>
      <SidebarGroup>
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <Collapsible
              key={item.id}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              {renderMenuItem(item)}
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          {/* TODO: 此处需要实现下拉分页加载，距今时间分组（今天、昨天、3天前、7天前、一个月前、更早） */}
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="今天">
              {Array.from({ length: 5 }).map((_, index) => (
                <HistoryCommandItem
                  key={index}
                  id={`today-${index}`}
                  title={`这样那样的${index + 1}`}
                  time="3小时前"
                  onDelete={(id) => console.log("delete", id)}
                  onRename={(id) => console.log("rename", id)}
                />
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="7天前">
              {Array.from({ length: 5 }).map((_, index) => (
                <HistoryCommandItem
                  key={index}
                  id={`week-${index}`}
                  title={`这里的那里的${index + 1}`}
                  time="7天前"
                  onDelete={(id) => console.log("delete", id)}
                  onRename={(id) => console.log("rename", id)}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
