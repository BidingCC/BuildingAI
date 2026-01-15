import { Button } from "@buildingai/ui/components/ui/button";
import { Progress } from "@buildingai/ui/components/ui/progress";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { BookCopy, ChevronRight, LibraryBig, Plus, Smile, Users } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

export function KnowledgeSidebar() {
  return <KnowledgeSidebarMain />;
}

export function KnowledgeSidebarMain({ className }: { className?: string }) {
  const { pathname } = useLocation();

  const navs = useMemo(() => {
    return [
      {
        id: "knowledge",
        title: "知识广场",
        path: "/knowledge",
        icon: LibraryBig,
      },
      {
        id: "knowledge-my",
        title: "我的知识库",
        path: "/knowledge/my",
        icon: BookCopy,
      },
      {
        id: "knowledge-joined",
        title: "团队知识库",
        path: "/knowledge/joined",
        icon: Users,
      },
    ];
  }, []);

  const isItemActive = (path?: string) => path === pathname;

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
