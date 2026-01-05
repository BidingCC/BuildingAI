"use client";

import * as React from "react";
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

import { DefaultNavMain } from "./default-nav-main";
import { DefaultNavUser } from "./default-nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@buildingai/ui/components/ui/sidebar";
import { DefaultLogo } from "./default-logo";
import { DefaultNavApps } from "./default-apps";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "新聊天",
      url: "#",
      icon: Edit,
    },
    {
      title: "应用",
      url: "#",
      icon: LayoutGrid,
    },
    {
      title: "智能体",
      url: "#",
      icon: Bot,
    },
    {
      title: "历史记录",
      url: "#",
      icon: FolderClock,
      isActive: true,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "AI绘图",
      url: "#",
      icon: Brush,
    },
    {
      name: "AI视频",
      url: "#",
      icon: Video,
    },
    {
      name: "AI写作",
      url: "#",
      icon: PenLineIcon,
    },
  ],
};

export function DefaultAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <DefaultLogo />
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
