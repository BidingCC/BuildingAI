"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@buildingai/ui/components/ui/sidebar";
import { Book, Send } from "lucide-react";
import * as React from "react";

import { ConsoleLogo } from "./console-logo";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";

const navSecondary = [
  {
    title: "开发文档",
    url: "https://www.buildingai.cc/docs/introduction/start",
    icon: Book,
  },
  {
    title: "意见反馈",
    url: "https://www.buildingai.cc/question",
    icon: Send,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <ConsoleLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
