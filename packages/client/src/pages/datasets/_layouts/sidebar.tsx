import {
  useDatasetDetail,
  useMyCreatedDatasetsInfiniteQuery,
  useTeamDatasetsInfiniteQuery,
} from "@buildingai/services/web";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { BookCopy, ChevronRight, LibraryBig, Loader2, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { DatasetEditDialog } from "../detail/_components/dialogs/dataset-edit-dialog";

const SIDEBAR_PAGE_SIZE = 10;

type SidebarItem = {
  id: string;
  title: string;
  path: string;
  squarePublishStatus?: string;
  publishedToSquare?: boolean;
  pendingJoin?: boolean;
};

export function DatasetsSidebar() {
  return <DatasetsSidebarMain />;
}

const toSidebarItem = (d: {
  id: string;
  name: string;
  squarePublishStatus?: string;
  publishedToSquare?: boolean;
}) => ({
  id: d.id,
  title: d.name,
  path: `/datasets/${d.id}`,
  squarePublishStatus: d.squarePublishStatus,
  publishedToSquare: d.publishedToSquare,
});

export function DatasetsSidebarMain({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const myQuery = useMyCreatedDatasetsInfiniteQuery(SIDEBAR_PAGE_SIZE);
  const teamQuery = useTeamDatasetsInfiniteQuery(SIDEBAR_PAGE_SIZE);

  const currentDatasetId = useMemo(() => {
    const match = pathname.match(/^\/datasets\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  const { data: currentDataset } = useDatasetDetail(currentDatasetId ?? undefined, {
    enabled: !!currentDatasetId,
  });

  const myDatasetsItems = useMemo(
    () => myQuery.data?.pages.flatMap((p) => p.items).map(toSidebarItem) ?? [],
    [myQuery.data?.pages],
  );
  const joinedDatasetsItems = useMemo(
    () => teamQuery.data?.pages.flatMap((p) => p.items).map(toSidebarItem) ?? [],
    [teamQuery.data?.pages],
  );

  const joinedDatasetsWithPending = useMemo(() => {
    if (!currentDataset) return joinedDatasetsItems;
    const existsInMy = myDatasetsItems.some((item) => item.id === currentDataset.id);
    const existsInJoined = joinedDatasetsItems.some((item) => item.id === currentDataset.id);
    const isDetailPage = pathname.startsWith("/datasets/") && pathname !== "/datasets";
    const isMember = currentDataset.isOwner || currentDataset.isMember;
    if (!isDetailPage || existsInMy || existsInJoined || isMember) return joinedDatasetsItems;
    const pendingItem: SidebarItem = {
      id: currentDataset.id,
      title: currentDataset.name,
      path: `/datasets/${currentDataset.id}`,
      squarePublishStatus: currentDataset.squarePublishStatus,
      publishedToSquare: currentDataset.publishedToSquare,
      pendingJoin: true,
    };
    return [pendingItem, ...joinedDatasetsItems];
  }, [currentDataset, joinedDatasetsItems, myDatasetsItems, pathname]);

  const loading = myQuery.isLoading;
  const loadingJoined = teamQuery.isLoading;
  const hasMoreMy = myQuery.hasNextPage ?? false;
  const hasMoreJoined = teamQuery.hasNextPage ?? false;
  const loadingMoreMy = myQuery.isFetchingNextPage;
  const loadingMoreJoined = teamQuery.isFetchingNextPage;
  const loadMoreMy = () => myQuery.fetchNextPage();
  const loadMoreJoined = () => teamQuery.fetchNextPage();
  const refetchMyDatasets = () => myQuery.refetch();

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
        items: joinedDatasetsWithPending,
        hasMore: hasMoreJoined,
        loadMore: loadMoreJoined,
        loadingMore: loadingMoreJoined,
      },
    ],
    [
      myDatasetsItems,
      joinedDatasetsItems,
      joinedDatasetsWithPending,
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
        <Button className="w-full" variant="outline" onClick={() => setCreateDialogOpen(true)}>
          <Plus />
          创建知识库
        </Button>
        {createDialogOpen && (
          <DatasetEditDialog
            mode="create"
            open
            onOpenChange={setCreateDialogOpen}
            onSuccess={refetchMyDatasets}
          />
        )}
      </SidebarHeader>
      <SidebarContent className="mt-2 px-2">
        {navs.map((item) => {
          const isActive = isItemActive(item.path);
          const isCollapsible = item.id === "datasets-my" || item.id === "datasets-joined";
          const hasActiveChildren = hasActiveChild(item.items);

          if (isCollapsible) {
            return (
              <Collapsible key={item.id} asChild defaultOpen className="group/collapsible block">
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
                          {item.items?.map((subItem) => {
                            const isPendingReview = subItem.squarePublishStatus === "pending";
                            const isPublished =
                              subItem.publishedToSquare ||
                              subItem.squarePublishStatus === "approved";
                            const isRejected = subItem.squarePublishStatus === "rejected";
                            const isPendingJoin = subItem.pendingJoin;
                            const showPublishedBadge =
                              isPublished && !isPendingReview && item.id !== "datasets-joined";
                            return (
                              <SidebarMenuSubItem key={subItem.id}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isItemActive(subItem.path)}
                                  className="h-9"
                                >
                                  <Link
                                    to={subItem.path}
                                    className="flex w-full items-center gap-1"
                                  >
                                    <span className="line-clamp-1 min-w-0 flex-1">
                                      {subItem.title}
                                    </span>
                                    {isPendingJoin && (
                                      <Button
                                        variant="secondary"
                                        size="xs"
                                        className="pointer-events-none"
                                      >
                                        待加入
                                      </Button>
                                    )}
                                    {isPendingReview && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="secondary"
                                            size="xs"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                            }}
                                          >
                                            审核中
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          正在审核中，审核通过后该知识库可在知识广场被发现
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {isRejected && !isPendingReview && !isPublished && (
                                      <Button
                                        variant="secondary"
                                        size="xs"
                                        className="text-destructive pointer-events-none"
                                      >
                                        审核未通过
                                      </Button>
                                    )}
                                    {showPublishedBadge && (
                                      <Button
                                        variant="secondary"
                                        size="xs"
                                        className="pointer-events-none"
                                      >
                                        已发布
                                      </Button>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                          {item.hasMore && item.loadMore && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground h-9 w-full"
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
            <SidebarMenuItem key={item.id} className="block">
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
