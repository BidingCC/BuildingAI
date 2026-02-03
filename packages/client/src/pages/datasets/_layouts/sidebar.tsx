import { listMyCreatedDatasets, listTeamDatasets } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import { Progress } from "@buildingai/ui/components/ui/progress";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import {
  BookCopy,
  ChevronDown,
  ChevronRight,
  LibraryBig,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { DatasetEditDialog } from "../[id]/_components/dialogs/dataset-edit-dialog";

const SIDEBAR_PAGE_SIZE = 20;

type SidebarItem = {
  id: string;
  title: string;
  path: string;
};

export function DatasetsSidebar() {
  return <DatasetsSidebarMain />;
}

export function DatasetsSidebarMain({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const [myDatasetsItems, setMyDatasetsItems] = useState<SidebarItem[]>([]);
  const [joinedDatasetsItems, setJoinedDatasetsItems] = useState<SidebarItem[]>([]);
  const [myTotal, setMyTotal] = useState(0);
  const [joinedTotal, setJoinedTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingJoined, setLoadingJoined] = useState(false);
  const [loadingMoreMy, setLoadingMoreMy] = useState(false);
  const [loadingMoreJoined, setLoadingMoreJoined] = useState(false);

  const toSidebarItem = (d: { id: string; name: string }) => ({
    id: d.id,
    title: d.name,
    path: `/datasets/${d.id}`,
  });

  const refetchMyDatasets = useCallback(() => {
    listMyCreatedDatasets({ page: 1, pageSize: SIDEBAR_PAGE_SIZE }).then(({ items, total }) => {
      setMyDatasetsItems(items.map(toSidebarItem));
      setMyTotal(total);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    listMyCreatedDatasets({ page: 1, pageSize: SIDEBAR_PAGE_SIZE })
      .then(({ items, total }) => {
        setMyDatasetsItems(items.map(toSidebarItem));
        setMyTotal(total);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoadingJoined(true);
    listTeamDatasets({ page: 1, pageSize: SIDEBAR_PAGE_SIZE })
      .then(({ items, total }) => {
        setJoinedDatasetsItems(items.map(toSidebarItem));
        setJoinedTotal(total);
      })
      .finally(() => setLoadingJoined(false));
  }, []);

  const hasMoreMy = myDatasetsItems.length < myTotal;
  const hasMoreJoined = joinedDatasetsItems.length < joinedTotal;

  const loadMoreMy = () => {
    if (loadingMoreMy || !hasMoreMy) return;
    const nextPage = Math.floor(myDatasetsItems.length / SIDEBAR_PAGE_SIZE) + 1;
    setLoadingMoreMy(true);
    listMyCreatedDatasets({ page: nextPage, pageSize: SIDEBAR_PAGE_SIZE })
      .then(({ items }) => {
        setMyDatasetsItems((prev) => [...prev, ...items.map(toSidebarItem)]);
      })
      .finally(() => setLoadingMoreMy(false));
  };

  const loadMoreJoined = () => {
    if (loadingMoreJoined || !hasMoreJoined) return;
    const nextPage = Math.floor(joinedDatasetsItems.length / SIDEBAR_PAGE_SIZE) + 1;
    setLoadingMoreJoined(true);
    listTeamDatasets({ page: nextPage, pageSize: SIDEBAR_PAGE_SIZE })
      .then(({ items }) => {
        setJoinedDatasetsItems((prev) => [...prev, ...items.map(toSidebarItem)]);
      })
      .finally(() => setLoadingMoreJoined(false));
  };

  const navs = useMemo<
    Array<{
      id: string;
      title: string;
      path?: string;
      icon?: typeof LibraryBig;
      items?: SidebarItem[];
      hasMore?: boolean;
      loadMore?: () => void;
      loadingMore?: boolean;
    }>
  >(
    () => [
      {
        id: "datasets",
        title: "知识广场",
        path: "/datasets",
        icon: LibraryBig,
      },
      {
        id: "datasets-my",
        title: "我的知识库",
        path: "",
        icon: BookCopy,
        items: myDatasetsItems,
        hasMore: hasMoreMy,
        loadMore: loadMoreMy,
        loadingMore: loadingMoreMy,
      },
      {
        id: "datasets-joined",
        title: "团队知识库",
        path: "",
        icon: Users,
        items: joinedDatasetsItems,
        hasMore: hasMoreJoined,
        loadMore: loadMoreJoined,
        loadingMore: loadingMoreJoined,
      },
    ],
    [
      myDatasetsItems,
      joinedDatasetsItems,
      hasMoreMy,
      hasMoreJoined,
      loadMoreMy,
      loadMoreJoined,
      loadingMoreMy,
      loadingMoreJoined,
    ],
  );

  const isItemActive = (path?: string) => path === pathname;
  const hasActiveChild = (items?: Array<{ path?: string }>) =>
    items?.some((item) => item.path === pathname) ?? false;

  return (
    <div
      className={cn(
        "bg-sidebar text-sidebar-foreground sticky top-0 hidden h-full w-52 flex-col md:flex",
        className,
      )}
    >
      <SidebarHeader className="flex flex-row items-center gap-1">
        <DatasetEditDialog mode="create" onSuccess={refetchMyDatasets}>
          <Button className="w-full" variant="outline">
            <Plus />
            创建知识库
          </Button>
        </DatasetEditDialog>
      </SidebarHeader>
      <SidebarContent className="mt-2 px-2">
        {navs.map((item) => {
          const isActive = isItemActive(item.path);
          const isCollapsible = item.id === "datasets-my" || item.id === "datasets-joined";
          const hasActiveChildren = hasActiveChild(item.items);

          if (isCollapsible) {
            return (
              <Collapsible key={item.id} asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="group/link-menu-item h-9"
                      isActive={hasActiveChildren}
                    >
                      {item.icon && (
                        <item.icon className="shrink-0" strokeWidth={hasActiveChildren ? 2.5 : 2} />
                      )}
                      <span className="mr-auto flex-1 whitespace-nowrap">{item.title}</span>
                      <SidebarMenuAction asChild className="[[data-state=open]_>_&]:rotate-90">
                        <span>
                          <ChevronRight />
                          <span className="sr-only">Toggle</span>
                        </span>
                      </SidebarMenuAction>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 pr-0">
                      {item.id === "datasets-my" && loading ? (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton className="h-9">
                            <span className="text-muted-foreground text-sm">加载中...</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ) : item.id === "datasets-joined" && loadingJoined ? (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton className="h-9">
                            <span className="text-muted-foreground text-sm">加载中...</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ) : (item.items?.length ?? 0) === 0 ? (
                        <SidebarMenuSubItem></SidebarMenuSubItem>
                      ) : (
                        <>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isItemActive(subItem.path)}
                                className="h-9"
                              >
                                <Link to={subItem.path}>
                                  <span className="line-clamp-1">{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          {item.hasMore && item.loadMore && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground h-9"
                                  onClick={item.loadMore}
                                  disabled={item.loadingMore}
                                >
                                  {item.loadingMore ? (
                                    <>
                                      <Loader2 className="size-4 animate-spin" />
                                      <span className="text-sm">加载中...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="size-4" />
                                      <span className="text-sm">加载更多</span>
                                    </>
                                  )}
                                </button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton className="group/link-menu-item h-9" isActive={isActive} asChild>
                <Link to={item.path || "/"}>
                  {item.icon && <item.icon className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />}
                  <span className="mr-auto flex-1 whitespace-nowrap">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className="text-muted-foreground text-xs">已使用 455MB / 1GB</span>
              <Button variant="ghost" size="xs" className="text-primary text-xs">
                扩容
                <ChevronRight />
              </Button>
            </div>
            <Progress value={33} className="bg-muted-foreground/10" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </div>
  );
}
