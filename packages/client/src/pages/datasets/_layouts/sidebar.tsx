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
import { BookCopy, ChevronRight, LibraryBig, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function DatasetsSidebar() {
  return <DatasetsSidebarMain />;
}

export function DatasetsSidebarMain({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const [myDatasetsItems, setMyDatasetsItems] = useState<
    Array<{
      id: string;
      title: string;
      path: string;
    }>
  >([]);
  const [joinedDatasetsItems, setJoinedDatasetsItems] = useState<
    Array<{
      id: string;
      title: string;
      path: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingJoined, setLoadingJoined] = useState(false);

  // Simulate API call to fetch my datasets items
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setMyDatasetsItems([
        { id: "1", title: "技术文档", path: "/datasets/1" },
        { id: "2", title: "产品设计", path: "/datasets/2" },
        { id: "3", title: "市场分析", path: "/datasets/3" },
        { id: "4", title: "用户手册", path: "/datasets/4" },
        { id: "5", title: "开发指南", path: "/datasets/5" },
      ]);
      setLoading(false);
    }, 800); // Simulate 800ms delay

    return () => clearTimeout(timer);
  }, []);

  // Simulate API call to fetch joined datasets items
  useEffect(() => {
    setLoadingJoined(true);
    const timer = setTimeout(() => {
      setJoinedDatasetsItems([
        { id: "team1", title: "前端团队知识库", path: "/datasets/joined/team1" },
        { id: "team2", title: "后端开发规范", path: "/datasets/joined/team2" },
        { id: "team3", title: "产品设计文档", path: "/datasets/joined/team3" },
        { id: "team4", title: "测试用例库", path: "/datasets/joined/team4" },
        { id: "team5", title: "运维手册", path: "/datasets/joined/team5" },
        { id: "team6", title: "项目管理指南", path: "/datasets/joined/team6" },
      ]);
      setLoadingJoined(false);
    }, 1000); // Simulate 1000ms delay

    return () => clearTimeout(timer);
  }, []);

  const navs = useMemo(() => {
    return [
      {
        id: "datasets",
        title: "知识广场",
        path: "/datasets",
        icon: LibraryBig,
      },
      {
        id: "datasets-my",
        title: "我的知识库",
        path: "/datasets/my",
        icon: BookCopy,
        items: myDatasetsItems,
      },
      {
        id: "datasets-joined",
        title: "团队知识库",
        path: "/datasets/joined",
        icon: Users,
        items: joinedDatasetsItems,
      },
    ];
  }, [myDatasetsItems, joinedDatasetsItems]);

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
        <Button className="w-full" variant="outline">
          <Plus />
          创建知识库
        </Button>
      </SidebarHeader>
      <SidebarContent className="mt-2 px-2">
        {navs.map((item) => {
          const isActive = isItemActive(item.path);
          const hasItems = item.items && item.items.length > 0;
          const hasActiveChildren = hasActiveChild(item.items);

          // Render collapsible menu item for "我的知识库"
          if (hasItems) {
            return (
              <Collapsible
                key={item.id}
                asChild
                defaultOpen={hasActiveChildren}
                className="group/collapsible"
              >
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
                      <SidebarMenuAction className="[[data-state=open]_>_&]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
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
                      ) : (
                        item.items?.map((subItem) => (
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
                        ))
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          // Render simple link menu item
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
