import type { TagTypeType } from "@buildingai/constants";
import { useI18n } from "@buildingai/i18n";
import type { ConsoleAgentItem, QueryConsoleAgentsDto } from "@buildingai/services/console";
import {
  useConsoleAgentsListQuery,
  useDeleteAgentMutation,
  usePublishAgentSquareMutation,
  useUnpublishAgentSquareMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Bot,
  ChartLine,
  EllipsisVertical,
  FileCheck,
  Info,
  Trash2,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { TagSelect } from "@/components/tags";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { DashboardDialog } from "./_components/dashboard-dialog";
import { ReviewDialog } from "./_components/review-dialog";

export const AgentCreateMode = {
  DIRECT: "direct",
  COZE: "coze",
  DIFY: "dify",
} as const;

const CREATE_MODE_MAP: Record<string, string> = {
  [AgentCreateMode.DIRECT]: "",
  [AgentCreateMode.COZE]: "",
  [AgentCreateMode.DIFY]: "",
};

const PAGE_SIZE = 30;

const statusClassName: Record<string, string> = {
  pending: "",
  rejected: "",
  none: "",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  unpublished: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
> = {
  pending: "secondary",
  rejected: "destructive",
  none: "outline",
  published: "secondary",
  unpublished: "secondary",
};

function getAgentDisplayStatus(
  row: Pick<ConsoleAgentItem, "squarePublishStatus" | "publishedToSquare">,
) {
  if (row.squarePublishStatus === "approved") {
    return row.publishedToSquare ? "published" : "unpublished";
  }

  return row.squarePublishStatus;
}

function StatusBadge({
  row,
  onRejectReasonClick,
}: {
  row: Pick<ConsoleAgentItem, "squarePublishStatus" | "publishedToSquare">;
  onRejectReasonClick?: () => void;
}) {
  const { t } = useI18n();

  const statusLabelMap: Record<string, string> = {
    pending: t("ai.agent.list.statusOptions.pending"),
    rejected: t("ai.agent.list.statusOptions.rejected"),
    none: t("ai.agent.list.statusOptions.none"),
    published: t("ai.agent.list.statusOptions.published"),
    unpublished: t("ai.agent.list.statusOptions.unpublished"),
  };
  const status = getAgentDisplayStatus(row);
  const label = statusLabelMap[status] ?? status;
  const variant = statusVariantMap[status] ?? "secondary";

  if (status === "rejected" && onRejectReasonClick) {
    return (
      <Badge
        variant={variant}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onRejectReasonClick();
        }}
      >
        {label}
        <Info className="ml-1 size-3 opacity-80" />
      </Badge>
    );
  }

  return (
    <Badge variant={variant} className={statusClassName[status]}>
      {label}
    </Badge>
  );
}

const AgentIndexPage = () => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [debouncedName] = useDebounceValue(name.trim(), 300);
  const [queryParams, setQueryParams] = useState<QueryConsoleAgentsDto>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [dashboardAgent, setDashboardAgent] = useState<ConsoleAgentItem | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [reviewAgent, setReviewAgent] = useState<ConsoleAgentItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { confirm: alertConfirm } = useAlertDialog();
  const { data, isLoading, refetch } = useConsoleAgentsListQuery(queryParams);
  const deleteAgentMutation = useDeleteAgentMutation({
    onSuccess: () => {
      toast.success(t("ai.agent.list.toast.deleteSuccess"));
      refetch();
    },
    onError: (e) => toast.error(t("ai.agent.list.toast.deleteFailed", { error: e.message })),
  });
  const publishMutation = usePublishAgentSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.agent.list.toast.publishSuccess"));
      refetch();
    },
  });
  const unpublishMutation = useUnpublishAgentSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.agent.list.toast.unpublishSuccess"));
      refetch();
    },
  });

  const STATUS_OPTIONS: { value: QueryConsoleAgentsDto["status"]; label: string }[] = [
    { value: "all", label: t("ai.agent.list.statusOptions.all") },
    { value: "pending", label: t("ai.agent.list.statusOptions.pending") },
    { value: "rejected", label: t("ai.agent.list.statusOptions.rejected") },
    { value: "none", label: t("ai.agent.list.statusOptions.none") },
    { value: "approved", label: t("ai.agent.list.statusOptions.approved") },
    { value: "published", label: t("ai.agent.list.statusOptions.published") },
    { value: "unpublished", label: t("ai.agent.list.statusOptions.unpublished") },
  ];


  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize: PAGE_SIZE,
    page: queryParams.page ?? 1,
    onPageChange: (page) => setQueryParams((prev) => ({ ...prev, page })),
  });

  // Update query params when debounced name changes
  useEffect(() => {
    setQueryParams((prev) => ({
      ...prev,
      name: debouncedName || undefined,
      page: 1,
    }));
  }, [debouncedName]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (value as QueryConsoleAgentsDto["status"]),
      page: 1,
    }));
  };

  const handleTagIdsChange = (ids: string[]) => {
    setQueryParams((prev) => ({
      ...prev,
      tagId: ids[0],
      page: 1,
    }));
  };

  const handleReview = (row: ConsoleAgentItem) => {
    setReviewAgent(row);
    setReviewOpen(true);
  };

  const handleOpenDashboard = (row: ConsoleAgentItem) => {
    setDashboardAgent(row);
    setDashboardOpen(true);
  };

  const handleRejectReasonClick = (reason: string | null | undefined) => {
    alertConfirm({
      title: t("ai.agent.list.confirm.rejectReasonTitle"),
      description: reason?.trim() ? reason : t("ai.agent.list.confirm.rejectReasonEmpty"),
      confirmText: t("ai.agent.list.confirm.confirmText"),
    }).catch(() => {});
  };

  const handleDelete = (row: ConsoleAgentItem) => {
    alertConfirm({
      title: t("ai.agent.list.confirm.deleteTitle"),
      description: t("ai.agent.list.confirm.deleteDesc", { name: row.name }),
      confirmText: t("ai.agent.list.confirm.delete"),
      cancelText: t("ai.agent.list.confirm.cancel"),
      confirmVariant: "destructive",
    })
      .then(() => {
        deleteAgentMutation.mutate(row.id);
      })
      .catch(() => {});
  };

  const handlePublish = (row: ConsoleAgentItem) => {
    alertConfirm({
      title: t("ai.agent.list.confirm.publishTitle"),
      description: t("ai.agent.list.confirm.publishDesc", { name: row.name }),
      confirmText: t("ai.agent.list.confirm.publish"),
    })
      .then(() => {
        publishMutation.mutate(row.id);
      })
      .catch(() => {});
  };

  const handleUnpublish = (row: ConsoleAgentItem) => {
    alertConfirm({
      title: t("ai.agent.list.confirm.unpublishTitle"),
      description: t("ai.agent.list.confirm.unpublishDesc", { name: row.name }),
      confirmText: t("ai.agent.list.confirm.unpublish"),
    })
      .then(() => {
        unpublishMutation.mutate(row.id);
      })
      .catch(() => {});
  };

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.total ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.agent.list.stats.totalAgents")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.pending ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.agent.list.stats.pendingAgents")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.published ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.agent.list.stats.publishedAgents")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.private ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.agent.list.stats.privateAgents")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.unpublished ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.agent.list.stats.unpublishedAgents")}
            </div>
          </div>
        </div>
        <div className="bg-background sticky top-0 z-2 mb-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder={t("ai.agent.list.searchPlaceholder")}
            className="text-sm"
            value={name}
            onChange={handleNameChange}
          />
          <Select value={queryParams.status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("ai.agent.list.statusOptions.all")} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value ?? "all"} value={opt.value ?? "all"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TagSelect
            type={"app" as TagTypeType}
            value={queryParams.tagId ? [queryParams.tagId] : []}
            onChange={handleTagIdsChange}
            placeholder={t("ai.agent.list.searchTags")}
          />
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("ai.agent.list.table.agent")}</TableHead>
                <TableHead>{t("ai.agent.list.table.creator")}</TableHead>
                <TableHead>{t("ai.agent.list.table.tags")}</TableHead>
                <TableHead className="text-center">{t("ai.agent.list.table.type")}</TableHead>
                <TableHead>{t("ai.agent.list.table.status")}</TableHead>
                <TableHead>{t("ai.agent.list.table.lastEdited")}</TableHead>
                <PermissionGuard
                  permissions={[
                    "agents:review",
                    "agents:publish",
                    "agents:unpublish",
                    "agents:dashboard",
                    "agents:delete",
                  ]}
                  any
                >
                  <TableHead>{t("ai.agent.list.table.action")}</TableHead>
                </PermissionGuard>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                    {t("ai.agent.list.empty.loading")}
                  </TableCell>
                </TableRow>
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                    {t("ai.agent.list.empty.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8 rounded-md after:rounded-md">
                          <AvatarImage src={row.avatar || ""} className="rounded-md" />
                          <AvatarFallback className="rounded-md">
                            <Bot className="text-primary size-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{row.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {row.creatorName}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[140px] flex-wrap gap-1">
                        {(row.tags ?? []).length > 0 ? (
                          (row.tags ?? []).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="truncate text-xs font-normal"
                            >
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {t(`ai.agent.list.agentTypeOptions.${row.createMode}` as any) ||
                        t("ai.agent.list.agentTypeOptions.unknown")}
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        row={row}
                        onRejectReasonClick={
                          row.squarePublishStatus === "rejected"
                            ? () => handleRejectReasonClick(row.squareRejectReason)
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TimeText
                        value={row.updatedAt}
                        variant="datetime"
                        format="YYYY/MM/DD HH:mm:ss"
                      />
                    </TableCell>
                    <PermissionGuard
                      permissions={[
                        "agents:review",
                        "agents:publish",
                        "agents:unpublish",
                        "agents:dashboard",
                        "agents:delete",
                      ]}
                      any
                    >
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <EllipsisVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <PermissionGuard permissions="agents:review">
                              {row.squarePublishStatus === "pending" && (
                                <DropdownMenuItem onSelect={() => handleReview(row)}>
                                  <FileCheck className="mr-2 size-4" />
                                  {t("ai.agent.list.actions.review")}
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:publish">
                              {row.squarePublishStatus === "approved" && !row.publishedToSquare && (
                                <DropdownMenuItem onSelect={() => handlePublish(row)}>
                                  <ArrowUpToLine className="mr-2 size-4" />
                                  {t("ai.agent.list.actions.publish")}
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:unpublish">
                              {row.squarePublishStatus === "approved" && row.publishedToSquare && (
                                <DropdownMenuItem onSelect={() => handleUnpublish(row)}>
                                  <ArrowDownToLine className="mr-2 size-4" />
                                  {t("ai.agent.list.actions.unpublish")}
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:dashboard">
                              <DropdownMenuItem onSelect={() => handleOpenDashboard(row)}>
                                <ChartLine className="mr-2 size-4" />
                                {t("ai.agent.list.actions.data")}
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:delete">
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={
                                  deleteAgentMutation.isPending ||
                                  publishMutation.isPending ||
                                  unpublishMutation.isPending
                                }
                                onSelect={() => handleDelete(row)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                {t("ai.agent.list.actions.delete")}
                              </DropdownMenuItem>
                            </PermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </PermissionGuard>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationComponent className="bg-background sticky bottom-0 mx-0 flex w-fit py-2" />
      </div>

      <DashboardDialog
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        agent={dashboardAgent}
      />

      {reviewOpen && (
        <ReviewDialog
          open
          onOpenChange={setReviewOpen}
          agent={reviewAgent}
          onSuccess={() => refetch()}
        />
      )}
    </PageContainer>
  );
};

export default AgentIndexPage;
