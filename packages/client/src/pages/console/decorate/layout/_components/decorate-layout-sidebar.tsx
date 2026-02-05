import { useConfigStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import { SidebarMenuButton } from "@buildingai/ui/components/ui/sidebar";
import { FolderClock, PanelLeftIcon } from "lucide-react";
import { BookSearch, Bot, Edit, LayoutGrid, Workflow } from "lucide-react";

import SvgIcons from "@/components/svg-icons";

export const DecorateLayoutSidebar = () => {
  const { websiteConfig } = useConfigStore((state) => state.config);

  const navMain = [
    {
      id: "new-chat",
      title: "新聊天",
      path: "/",
      icon: Edit,
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
    {
      id: "datasets",
      title: "知识库",
      path: "/datasets",
      icon: BookSearch,
    },
    {
      id: "workflow",
      title: "工作流",
      path: "/workflow",
      icon: Workflow,
    },
    {
      id: "chat-history",
      title: "历史记录",
      icon: FolderClock,
    },
  ];

  return (
    <div className="bg-sidebar absolute top-0 left-0 h-full w-64 rounded-bl-lg max-sm:w-full max-sm:rounded-br-lg md:border-r">
      <div className="p-2">
        <SidebarMenuButton size="lg" asChild>
          <div className="relative flex items-center justify-between">
            <div>
              <>
                {websiteConfig?.webinfo.logo ? (
                  <img
                    className="h-8"
                    src={websiteConfig?.webinfo.logo}
                    alt={websiteConfig?.webinfo.name}
                  />
                ) : (
                  <SvgIcons.buildingai className="size-8!" />
                )}
              </>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-accent-foreground/5 absolute top-1/2 right-2 -translate-y-1/2"
            >
              <PanelLeftIcon />
            </Button>
          </div>
        </SidebarMenuButton>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {navMain.map((item) => {
          return (
            <SidebarMenuButton className="h-9">
              {item.icon && <item.icon className="shrink-0" />}
              <span className="mr-auto flex-1 whitespace-nowrap">{item.title}</span>
            </SidebarMenuButton>
          );
        })}
      </div>
    </div>
  );
};
