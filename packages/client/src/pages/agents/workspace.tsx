import { useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import { useDeleteAgentMutation, useMyAgentsInfiniteQuery } from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@buildingai/ui/components/ui/item";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { Bot, ChevronRight, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AgentModal } from "./_components/agent-modal";

const PAGE_SIZE = 20;

type StatusFilter = "all" | "published" | "unpublished";

type AgentWorkspaceStatus = "pending" | "rejected" | "none" | "published" | "unpublished";

type AgentWorkspaceStatusSource = {
  publishedToSquare?: boolean | null;
  squarePublishStatus?: "none" | "pending" | "approved" | "rejected";
};

type AgentWorkspaceStatusConfig = {
  label: string;
  className?: string;
  variant:
    | "link"
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | null
    | undefined;
};

const statusConfigMap: Record<AgentWorkspaceStatus, AgentWorkspaceStatusConfig> = {
  pending: {
    label: "status.pending",
    variant: "secondary",
  },
  rejected: {
    label: "status.rejected",
    variant: "destructive",
  },
  none: {
    label: "status.private",
    variant: "outline",
  },
  published: {
    label: "status.published",
    variant: "secondary",
    className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  unpublished: {
    label: "status.unpublished",
    variant: "secondary",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
};

function getAgentWorkspaceStatus(agent: AgentWorkspaceStatusSource): AgentWorkspaceStatus {
  if (agent.squarePublishStatus === "approved") {
    return agent.publishedToSquare ? "published" : "unpublished";
  }

  return agent.squarePublishStatus ?? "none";
}

function getAgentWorkspaceStatusConfig(
  agent: AgentWorkspaceStatusSource,
): AgentWorkspaceStatusConfig {
  const status = getAgentWorkspaceStatus(agent);
  return statusConfigMap[status];
}

const AgentsWorkspacePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirm: alertConfirm } = useAlertDialog();

  useDocumentHead({
    title: t("agent.workspace.myAgents"),
  });

  const handleCreateSuccess = (agent: unknown) => {
    myAgentsQuery.refetch();
    const id = (agent as { id?: string } | null)?.id;
    if (id) navigate(`/agents/${id}/configuration`);
  };

  const myAgentsQuery = useMyAgentsInfiniteQuery(
    {
      pageSize: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      status,
    },
    { enabled: true },
  );

  const items = useMemo(
    () => myAgentsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [myAgentsQuery.data?.pages],
  );
  const hasNextPage = myAgentsQuery.hasNextPage ?? false;
  const isFetchingNextPage = myAgentsQuery.isFetchingNextPage;

  const deleteAgentMutation = useDeleteAgentMutation();

  const handleDeleteAgent = async (agent: { id: string; name: string }) => {
    try {
      await alertConfirm({
        title: t("agent.workspace.deleteConfirm"),
        description: t("agent.workspace.deleteAgentConfirm", { name: agent.name }),
        confirmText: t("agent.workspace.delete"),
        cancelText: t("agent.workspace.cancel"),
        confirmVariant: "destructive",
      });
    } catch {
      return;
    }

    try {
      await deleteAgentMutation.mutateAsync(agent.id);
      toast.success(t("agent.workspace.deleteSuccess"));
      myAgentsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("agent.workspace.deleteFailed");
      toast.error(message || t("agent.workspace.deleteFailed"));
    }
  };

  const badgeClass = (selected: boolean) =>
    cn(
      "h-9 px-4 font-medium text-nowrap sm:font-normal cursor-pointer",
      selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
    );

  return (
    <div className="flex w-full flex-col items-center">
      <div className="bg-background sticky top-0 z-20 flex h-13 w-full items-center px-2">
        <SidebarTrigger className="md:hidden" />
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link to="/agents">
              <Bot />
              {t("agent.square.title")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl">{t("agent.workspace.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("agent.workspace.description")}</p>
          </div>
          <div className="max-sm:w-full">
            <InputGroup className="rounded-full">
              <InputGroupInput
                placeholder={t("agent.workspace.searchPlaceholder")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            <Badge className={badgeClass(status === "all")} onClick={() => setStatus("all")}>
              {t("agent.workspace.all")}
            </Badge>
            <Badge
              className={badgeClass(status === "published")}
              onClick={() => setStatus("published")}
            >
              {t("agent.workspace.published")}
            </Badge>
            <Badge
              className={badgeClass(status === "unpublished")}
              onClick={() => setStatus("unpublished")}
            >
              {t("agent.workspace.private")}
            </Badge>
          </div>
          <Button className="ml-auto rounded-full" onClick={() => setIsModalOpen(true)}>
            <Plus />
            {t("agent.workspace.createAgent")}
          </Button>
        </div>

        <AgentModal
          mode="create"
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={handleCreateSuccess}
        />

        <div className="mt-6">
          {myAgentsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {t("agent.workspace.noAgents")}
            </p>
          ) : (
            <InfiniteScroll
              loading={isFetchingNextPage}
              hasMore={hasNextPage}
              onLoadMore={() => myAgentsQuery.fetchNextPage()}
              emptyText=""
              showEmptyText={!hasNextPage}
            >
              <div className="grid gap-x-4 sm:grid-cols-2">
                {items.map((agent) => {
                  const initial = agent.name.slice(0, 1).toUpperCase();
                  const statusConfig = getAgentWorkspaceStatusConfig(agent);
                  return (
                    <Item
                      key={agent.id}
                      className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding] hover:px-4"
                      onClick={() => navigate(`/agents/${agent.id}/configuration`)}
                    >
                      <ItemMedia>
                        <Avatar className="size-10">
                          <AvatarImage src={agent.avatar ?? undefined} />
                          <AvatarFallback>{initial || <Bot />}</AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="flex gap-2">
                          {agent.name}
                          {getAgentWorkspaceStatus(agent) !== "none" && (
                            <Badge
                              variant={statusConfig.variant}
                              className={statusConfig.className}
                            >
                              {t(statusConfig.label)}
                            </Badge>
                          )}
                        </ItemTitle>
                        <ItemDescription>
                          {agent.description?.toString().trim() || t("agent.square.noDescription")}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                          aria-label={t("common.action.delete")}
                          disabled={deleteAgentMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteAgent(agent);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="rounded-full"
                          aria-label={t("agent.workspace.enter")}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/agents/${agent.id}/configuration`);
                          }}
                        >
                          <ChevronRight />
                        </Button>
                      </ItemActions>
                    </Item>
                  );
                })}
              </div>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentsWorkspacePage;
