import { useI18n } from "@buildingai/i18n";
import { useAgentDetailQuery } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import { Separator } from "@buildingai/ui/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { cn } from "@buildingai/ui/lib/utils";
import {
  Activity,
  ChevronLeft,
  ExternalLink,
  FileText,
  Send,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import * as React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { AgentModal } from "@/pages/agents/_components/agent-modal";

export function OrchestrationSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const agentId = id ?? "";
  const {
    data: agent,
    isLoading,
    refetch,
  } = useAgentDetailQuery(id, { refetchOnWindowFocus: false });
  const [editOpen, setEditOpen] = React.useState(false);

  const title = agent?.name ?? "";
  const description = agent?.description ?? "";

  const menuItems = [
    {
      path: "configuration",
      label: t("agent.detail.sidebar.orchestration"),
      icon: SlidersHorizontal,
    },
    { path: "publish", label: t("agent.detail.sidebar.publish"), icon: Send },
    { path: "logs", label: t("agent.detail.sidebar.logs"), icon: FileText },
    { path: "monitoring", label: t("agent.detail.sidebar.monitoring"), icon: Activity },
  ];

  return (
    <Sidebar collapsible="icon" {...props} className="bg-sidebar rounded-r-lg border-r-0! p-2">
      <SidebarHeader
        className="group/header hover:bg-muted-foreground/10 rounded-lg px-2 py-3 transition-colors"
        onClick={() => setEditOpen(true)}
      >
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/agents/workspace");
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 group-data-[collapsible=icon]:hidden"
            onClick={(e) => {
              e.stopPropagation();
              setEditOpen(true);
            }}
          >
            <Settings2 className="size-4" />
          </Button>
        </div>

        <div className="mt-2 flex flex-col items-start gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          {isLoading ? (
            <>
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </>
          ) : (
            <>
              <div className="flex w-full min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {title || t("agent.square.title")}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {description || t("agent.detail.sidebar.documentation")}
                </span>
              </div>
            </>
          )}
        </div>
      </SidebarHeader>
      <Separator className="my-4" />
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const isPublishRelated =
              location.pathname.startsWith(`/agents/${agentId}/publish`) ||
              location.pathname.startsWith(`/agents/${agentId}/develop`);
            const isActive =
              item.path === "publish"
                ? isPublishRelated
                : location.pathname.startsWith(`/agents/${agentId}/${item.path}`);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild className="h-10">
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-primary/10 text-primary",
                    )}
                    onClick={() => navigate(`/agents/${agentId}/${item.path}`)}
                  >
                    <item.icon />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9" asChild>
              <Link to="/console/dashboard">
                <FileText />
                <span className="whitespace-nowrap">{t("agent.detail.sidebar.documentation")}</span>
                <SidebarMenuAction asChild>
                  <div>
                    <ExternalLink />
                    <span className="sr-only">Toggle</span>
                  </div>
                </SidebarMenuAction>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <AgentModal
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        agentId={agentId}
        initialValues={{
          name: agent?.name ?? "",
          description: agent?.description ?? "",
          avatarUrl: agent?.avatar ?? undefined,
          creationMethod: (agent?.createMode as "direct" | "coze" | "dify" | undefined) ?? "direct",
        }}
        onSuccess={() => {
          refetch();
          setEditOpen(false);
        }}
      />
    </Sidebar>
  );
}
