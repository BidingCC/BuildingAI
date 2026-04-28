import type { TagTypeType } from "@buildingai/constants";
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

import { ProviderIcon } from "@/components/provider-icons";
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
  [AgentCreateMode.DIRECT]: "系统智能体",
  [AgentCreateMode.COZE]: "Coze智能体",
  [AgentCreateMode.DIFY]: "Dify智能体",
};

const PAGE_SIZE = 30;

const STATUS_OPTIONS: { value: QueryConsoleAgentsDto["status"]; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "审核失败" },
  { value: "none", label: "私有" },
  { value: "approved", label: "审核通过" },
  { value: "published", label: "已公开" },
  { value: "unpublished", label: "已下架" },
];

const statusLabelMap: Record<string, string> = {
  pending: "待审核",
  rejected: "审核失败",
  none: "私有",
  published: "已公开",
  unpublished: "已下架",
};

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
      toast.success("已删除");
      refetch();
    },
    onError: (e) => toast.error(`删除失败: ${e.message}`),
  });
  const publishMutation = usePublishAgentSquareMutation({
    onSuccess: () => {
      toast.success("已上架");
      refetch();
    },
  });
  const unpublishMutation = useUnpublishAgentSquareMutation({
    onSuccess: () => {
      toast.success("已下架");
      refetch();
    },
  });

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
      title: "拒绝原因",
      description: reason?.trim() ? reason : "未填写拒绝原因",
      confirmText: "确定",
    }).catch(() => {});
  };

  const handleDelete = (row: ConsoleAgentItem) => {
    alertConfirm({
      title: "删除确认",
      description: `确定要删除智能体"${row.name}"吗？此操作不可恢复。`,
      confirmText: "删除",
      cancelText: "取消",
      confirmVariant: "destructive",
    })
      .then(() => {
        deleteAgentMutation.mutate(row.id);
      })
      .catch(() => {});
  };

  const handlePublish = (row: ConsoleAgentItem) => {
    alertConfirm({
      title: "上架智能体",
      description: `确定要上架智能体"${row.name}"吗？上架后将在智能体广场中展示。`,
      confirmText: "上架",
    })
      .then(() => {
        publishMutation.mutate(row.id);
      })
      .catch(() => {});
  };

  const handleUnpublish = (row: ConsoleAgentItem) => {
    alertConfirm({
      title: "下架智能体",
      description: `确定要下架智能体"${row.name}"吗？下架后将不再在智能体广场中展示。`,
      confirmText: "下架",
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
            <div className="text-muted-foreground text-xs">总智能体</div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.pending ?? 0}</div>
            <div className="text-muted-foreground text-xs">待审核</div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.published ?? 0}</div>
            <div className="text-muted-foreground text-xs">已公开</div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.private ?? 0}</div>
            <div className="text-muted-foreground text-xs">私有</div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.unpublished ?? 0}</div>
            <div className="text-muted-foreground text-xs">已下架</div>
          </div>
        </div>
        <div className="bg-background sticky top-0 z-2 mb-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="智能体/用户名称搜索"
            className="text-sm"
            value={name}
            onChange={handleNameChange}
          />
          <Select value={queryParams.status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="全部" />
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
            placeholder="搜索标签"
          />
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>智能体</TableHead>
                <TableHead>创建人</TableHead>
                <TableHead>对话模型</TableHead>
                <TableHead>标签</TableHead>
                <TableHead className="text-center">智能体类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近编辑</TableHead>
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
                  <TableHead>操作</TableHead>
                </PermissionGuard>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                    暂无智能体数据
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex max-w-60 items-center gap-2">
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
                      <div className="flex max-w-52 items-center gap-2">
                        <span className="flex size-5 items-center justify-center">
                          <ProviderIcon
                            provider={row.modelProvider ?? undefined}
                            iconUrl={row.iconUrl?.trim() || undefined}
                            className="text-primary size-4 rounded-sm"
                            fallback={<Bot className="text-primary size-4" />}
                          />
                        </span>
                        <span className="truncate">{row.modelName || "-"}</span>
                      </div>
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
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {CREATE_MODE_MAP[row.createMode] ?? "未知"}
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
                                  审核
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:publish">
                              {row.squarePublishStatus === "approved" && !row.publishedToSquare && (
                                <DropdownMenuItem onSelect={() => handlePublish(row)}>
                                  <ArrowUpToLine className="mr-2 size-4" />
                                  上架
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:unpublish">
                              {row.squarePublishStatus === "approved" && row.publishedToSquare && (
                                <DropdownMenuItem onSelect={() => handleUnpublish(row)}>
                                  <ArrowDownToLine className="mr-2 size-4" />
                                  下架
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="agents:dashboard">
                              <DropdownMenuItem onSelect={() => handleOpenDashboard(row)}>
                                <ChartLine className="mr-2 size-4" />
                                数据
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
                                删除
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
