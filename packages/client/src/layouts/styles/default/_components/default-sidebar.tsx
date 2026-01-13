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
import { useEffect, useMemo } from "react";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { DefaultNavApps } from "./default-apps";
import { DefaultLogo } from "./default-logo";
import { DefaultNavMain } from "./default-nav-main";
import { DefaultNavUser } from "./default-nav-user";

/**
 * Keyboard shortcut component that registers a global shortcut and displays the key hint
 */
function KeyboardShortcut({
  keys,
  onTrigger,
  className,
}: {
  keys: { meta?: boolean; ctrl?: boolean; shift?: boolean; key: string };
  onTrigger: () => void;
  className?: string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const metaMatch = keys.meta ? e.metaKey : true;
      const ctrlMatch = keys.ctrl ? e.ctrlKey : true;
      const shiftMatch = keys.shift ? e.shiftKey : true;
      const keyMatch = e.key.toLowerCase() === keys.key.toLowerCase();

      if (metaMatch && ctrlMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keys, onTrigger]);

  const label = [keys.meta && "⌘", keys.ctrl && "⌃", keys.shift && "⇧", keys.key.toUpperCase()]
    .filter(Boolean)
    .join("");

  return <span className={className}>{label}</span>;
}

const data = {
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
  const navigate = useNavigate();

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
        id: "new-chat",
        title: "新聊天",
        path: "/",
        icon: Edit,
        action: (
          <KeyboardShortcut
            keys={{ meta: true, key: "k" }}
            onTrigger={() => navigate("/")}
            className="text-muted-foreground/70 opacity-0 group-hover/link-menu-item:opacity-100"
          />
        ),
      },
      {
        id: "app-center",
        title: "应用",
        path: "/apps",
        icon: LayoutGrid,
      },
      {
        id: "agent-center",
        title: "智能体",
        path: "/agents",
        icon: Bot,
      },
    ];

    const conversationItems =
      conversationsData?.items?.map((conversation) => ({
        id: `conversation-${conversation.id}`,
        title: conversation.title || "新对话",
        path: `/c/${conversation.id}`,
      })) || [];

    return [
      ...baseItems,
      {
        id: "chat-history",
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
                <span className="whitespace-nowrap">工作台</span>
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
