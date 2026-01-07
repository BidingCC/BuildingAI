import { useConversationsQuery } from "@buildingai/services/web";
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
import {
  ArrowUpRight,
  Bot,
  Brush,
  Edit,
  FolderClock,
  LayoutDashboard,
  LayoutGrid,
  PenLineIcon,
  Video,
} from "lucide-react";
import { useMemo } from "react";
import * as React from "react";
import { Link } from "react-router-dom";

import { DefaultNavApps } from "./default-apps";
import { DefaultLogo } from "./default-logo";
import { DefaultNavMain } from "./default-nav-main";
import { DefaultNavUser } from "./default-nav-user";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  projects: [
    {
      name: "AI绘图",
      path: "#",
      icon: Brush,
    },
    {
      name: "AI视频",
      path: "#",
      icon: Video,
    },
    {
      name: "AI写作",
      path: "#",
      icon: PenLineIcon,
    },
  ],
};

export function DefaultAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: conversationsData } = useConversationsQuery(
    {
      page: 1,
      pageSize: 6,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const navMain = useMemo(() => {
    const baseItems = [
      {
        title: "新聊天",
        path: "/",
        icon: Edit,
      },
      {
        title: "应用",
        path: "/apps",
        icon: LayoutGrid,
      },
      {
        title: "智能体",
        path: "/agents",
        icon: Bot,
      },
    ];

    const conversationItems =
      conversationsData?.items?.map((conversation) => ({
        title: conversation.title || "新对话",
        path: `/c/${conversation.id}`,
      })) || [];

    return [
      ...baseItems,
      {
        title: "历史记录",
        icon: FolderClock,
        isActive: true,
        items: conversationItems,
      },
    ];
  }, [conversationsData]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row items-center">
        <DefaultLogo />
      </SidebarHeader>
      <SidebarContent>
        <DefaultNavMain items={navMain} />
        <DefaultNavApps projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9" asChild>
              <Link to="/console/dashboard">
                <LayoutDashboard />
                工作台
                <SidebarMenuAction asChild>
                  <div>
                    <ArrowUpRight />
                    <span className="sr-only">Toggle</span>
                  </div>
                </SidebarMenuAction>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <DefaultNavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
