"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Brush,
  Command,
  Edit,
  FolderClock,
  Frame,
  GalleryVerticalEnd,
  LayoutGrid,
  Map,
  PenLineIcon,
  PieChart,
  Settings2,
  SquareTerminal,
  Video,
} from "lucide-react";
import * as React from "react";

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
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row items-center">
        <DefaultLogo />
        {state === "expanded" && <SidebarTrigger />}
      </SidebarHeader>
      <SidebarContent>
        <DefaultNavMain items={data.navMain} />
        <DefaultNavApps projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <DefaultNavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
