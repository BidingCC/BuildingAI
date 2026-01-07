"use client";

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
  navMain: [
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
    {
      title: "历史记录",
      icon: FolderClock,
      isActive: true,
      items: [
        {
          title: "使用js写一个冒泡排序算法，我需要",
          path: "/c/7PBaqoYg2flwsG61ql04T",
        },
        {
          title: "如何用js实现一个计算器",
          path: "/c/kQAqx0N0KVRaSQCvUwUoj",
        },
        {
          title: "为什么会写代码",
          path: "/c/gwY9YWicogwmAg9Z0awnJ",
        },
      ],
    },
  ],
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row items-center">
        <DefaultLogo />
      </SidebarHeader>
      <SidebarContent>
        <DefaultNavMain items={data.navMain} />
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
