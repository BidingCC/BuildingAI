"use client";

import {
  type ConversationRecord,
  useConversationsQuery,
  useDeleteConversation,
  useUpdateConversation,
} from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@buildingai/ui/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  formatRelativeTime,
  groupConversationsByTime,
  TIME_GROUP_LABELS,
  type TimeGroup,
} from "../utils/conversation-group";

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
  onSelect,
}: {
  id: string;
  title: string;
  time: string;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onSelect?: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSelect = useCallback(() => {
    if (!showConfirm && !isEditing) {
      onSelect?.(id);
    }
  }, [id, onSelect, showConfirm, isEditing]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
    setIsEditing(false);
  }, []);

  const handleConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(id);
      setShowConfirm(false);
    },
    [id, onDelete],
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowConfirm(false);
      setIsEditing(false);
      setEditValue(title);
    },
    [title],
  );

  const handleRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowConfirm(false);
  }, []);

  const handleSaveRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (editValue.trim() && editValue !== title) {
        onRename(id, editValue.trim());
      }
      setIsEditing(false);
    },
    [id, editValue, title, onRename],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.stopPropagation();
        handleSaveRename(e as any);
      } else if (e.key === "Escape") {
        e.stopPropagation();
        handleCancel(e as any);
      }
    },
    [handleSaveRename, handleCancel],
  );

  return (
    <CommandItem className="h-9" value={id} onSelect={handleSelect}>
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="h-9 flex-1 -translate-x-2 border-0 focus-within:ring-0 focus-visible:ring-0"
          autoFocus
        />
      ) : (
        <span className="line-clamp-1 flex-1">{title}</span>
      )}
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
        ) : isEditing ? (
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
              onClick={handleSaveRename}
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
 * Conversation sub-item with rename and delete functionality
 */
function ConversationSubItem({ subItem, isActive }: { subItem: NavSubItem; isActive: boolean }) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(subItem.title);
  const { confirm } = useAlertDialog();
  const deleteMutation = useDeleteConversation();
  const updateMutation = useUpdateConversation();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Extract conversation ID from path (format: /c/${conversationId})
  const conversationId = subItem.path?.replace("/c/", "") || "";

  useEffect(() => {
    setRenameValue(subItem.title);
  }, [subItem.title]);

  const handleRename = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (!renameValue.trim() || renameValue.trim() === subItem.title) {
      setRenameDialogOpen(false);
      return;
    }

    updateMutation.mutate(
      { id: conversationId, title: renameValue.trim() },
      {
        onSuccess: () => {
          setRenameDialogOpen(false);
        },
      },
    );
  }, [conversationId, renameValue, subItem.title, updateMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRenameConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setRenameDialogOpen(false);
        setRenameValue(subItem.title);
      }
    },
    [handleRenameConfirm, subItem.title],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setRenameDialogOpen(open);
      if (!open) {
        // Reset to original title when dialog closes
        setRenameValue(subItem.title);
      }
    },
    [subItem.title],
  );

  const handleDeleteWithNavigation = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await confirm({
          title: "删除对话",
          description: "确定要删除这条对话记录吗？此操作不可恢复。",
          confirmVariant: "destructive",
        });
        deleteMutation.mutate(conversationId, {
          onSuccess: () => {
            // If the deleted conversation is currently active, navigate to home
            if (pathname === subItem.path) {
              navigate("/");
            }
          },
        });
      } catch {
        // User cancelled
      }
    },
    [conversationId, confirm, deleteMutation, pathname, subItem.path, navigate],
  );

  return (
    <>
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={isActive} className="h-9">
          <Link to={subItem.path || ""} className="flex items-center justify-between">
            <span
              className={cn(
                "line-clamp-1",
                "group-focus-within/menu-sub-item:pr-4 group-hover/menu-sub-item:pr-4",
                { "font-bold": isActive },
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
                className="group-hover/menu-sub-item:opacity-100! md:group-focus-within/menu-item:opacity-0 md:group-hover/menu-item:opacity-0"
              >
                <EllipsisVertical />
                <span className="sr-only">More</span>
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleRename}>
                <PenLine />
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteWithNavigation}>
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarMenuSubItem>

      <Dialog open={renameDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
            <DialogDescription>请输入新的对话名称</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="对话名称"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!renameValue.trim()}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const { isLogin } = useAuthStore((state) => state.authActions);
  const isItemActive = (path?: string) => path === pathname;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        className="group/history-chat-icon h-9"
        onClick={onOpenDialog}
        asChild
      >
        <div>
          {item.icon && (
            <>
              {state === "expanded" ? (
                <CollapsibleTrigger asChild className="group/collapsible">
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
        </div>
      </SidebarMenuButton>
      <CollapsibleContent>
        {isLogin() && !!item.items?.length && (
          <SidebarMenuSub className="mr-0 pr-0">
            {item.items?.map((subItem) => (
              <ConversationSubItem
                key={subItem.id}
                subItem={subItem}
                isActive={isItemActive(subItem.path)}
              />
            ))}
            <SidebarMenuSubItem>
              <SidebarMenuSubButton onClick={onOpenDialog} className="h-9 cursor-pointer">
                <span className="text-muted-foreground line-clamp-1 text-xs font-medium">
                  查看全部
                </span>
                <span className="sr-only">查看全部</span>
              </SidebarMenuSubButton>
              <SidebarMenuAction
                showOnHover
                className="group-hover/menu-sub-item:opacity-100! md:group-focus-within/menu-item:opacity-0 md:group-hover/menu-item:opacity-0"
              >
                <ArrowUpRight className="text-muted-foreground size-3" />
              </SidebarMenuAction>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        )}
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
      <CollapsibleTrigger asChild className="group/collapsible">
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
  const navigate = useNavigate();
  const { isLogin } = useAuthStore((state) => state.authActions);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [allConversations, setAllConversations] = useState<ConversationRecord[]>([]);
  const pageSize = 20;

  const { data, isLoading } = useConversationsQuery(
    { page, pageSize, keyword: keyword || undefined },
    { enabled: open },
  );

  const hasMore = useMemo(() => {
    if (data === undefined) return true;
    if (!data?.total) return false;
    return allConversations.length < data.total;
  }, [data, allConversations.length]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setKeyword("");
      setAllConversations(data?.items || []);
    }
  }, [open]);

  useEffect(() => {
    if (data?.items) {
      if (page === 1) {
        setAllConversations(data.items);
      } else {
        setAllConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newItems = data.items.filter((item) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data?.items, page]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore]);

  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
    setPage(1);
    setAllConversations([]);
  }, []);

  const deleteMutation = useDeleteConversation();
  const updateMutation = useUpdateConversation();

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/c/${id}`);
      setOpen(false);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          setAllConversations((prev) => prev.filter((c) => c.id !== id));
        },
      });
    },
    [deleteMutation],
  );

  const handleRename = useCallback(
    (id: string, newTitle: string) => {
      updateMutation.mutate(
        { id, title: newTitle },
        {
          onSuccess: () => {
            setAllConversations((prev) =>
              prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
            );
          },
        },
      );
    },
    [updateMutation],
  );

  const groupedConversations = useMemo(
    () => groupConversationsByTime(allConversations),
    [allConversations],
  );

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
          onOpenDialog={() => isLogin() && setOpen(true)}
        />
      );
    }

    if (hasItems) {
      return <CollapsibleMenuItem item={item} isActive={hasActiveChild(item.items)} />;
    }

    return <LinkMenuItem item={item} isActive={isItemActive(item.path)} />;
  };

  const renderGroups = () => {
    const groups: React.ReactNode[] = [];
    const order: TimeGroup[] = ["today", "yesterday", "3days", "7days", "30days", "older"];
    let isFirst = true;

    for (const group of order) {
      const conversations = groupedConversations.get(group) || [];
      if (conversations.length === 0) continue;

      if (!isFirst) {
        groups.push(<CommandSeparator key={`sep-${group}`} />);
      }
      isFirst = false;

      groups.push(
        <CommandGroup key={group} heading={TIME_GROUP_LABELS[group]}>
          {conversations.map((conversation) => (
            <HistoryCommandItem
              key={conversation.id}
              id={conversation.id}
              title={conversation.title || "new chat"}
              time={formatRelativeTime(conversation.createdAt)}
              onDelete={handleDelete}
              onRename={handleRename}
              onSelect={handleSelect}
            />
          ))}
        </CommandGroup>,
      );
    }

    return groups;
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
        <Command shouldFilter={false}>
          <CommandInput placeholder="搜索对话..." value={keyword} onValueChange={handleSearch} />
          <CommandList className="h-[400px] max-h-[400px]">
            <InfiniteScroll
              loading={isLoading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              threshold={50}
            >
              {renderGroups()}
            </InfiniteScroll>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
