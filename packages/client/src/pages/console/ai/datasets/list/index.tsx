import type { TagTypeType } from "@buildingai/constants";
import { useI18n } from "@buildingai/i18n";
import {
  type ConsoleDatasetItem,
  type QueryConsoleDatasetsDto,
  useConsoleDatasetsListQuery,
  useDeleteDatasetMutation,
  usePublishDatasetSquareMutation,
  useUnpublishDatasetSquareMutation,
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
  BookOpen,
  EllipsisVertical,
  FileCheck,
  FileText,
  Info,
  Layers,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { TagSelect } from "@/components/tags";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { DocumentDialog } from "./_components/document-dialog";
import { MemberDialog } from "./_components/member-dialog";
import { ReviewDialog } from "./_components/review-dialog";
import { VectorConfigDialog } from "./_components/vector-config-dialog";

const PAGE_SIZE = 30;

const STATUS_OPTIONS: { value: QueryConsoleDatasetsDto["status"]; labelKey: string }[] = [
  { value: "all", labelKey: "ai.dataset.list.status.all" },
  { value: "pending", labelKey: "ai.dataset.list.status.pending" },
  { value: "rejected", labelKey: "ai.dataset.list.status.rejected" },
  { value: "none", labelKey: "ai.dataset.list.status.none" },
  { value: "approved", labelKey: "ai.dataset.list.status.approved" },
  { value: "published", labelKey: "ai.dataset.list.status.published" },
  { value: "unpublished", labelKey: "ai.dataset.list.status.unpublished" },
];

const statusLabelKeys: Record<string, string> = {
  pending: "ai.dataset.list.status.pending",
  rejected: "ai.dataset.list.status.rejected",
  none: "ai.dataset.list.status.none",
  published: "ai.dataset.list.status.published",
  unpublished: "ai.dataset.list.status.unpublished",
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

const statusClassName: Record<string, string> = {
  pending: "",
  rejected: "",
  none: "",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  unpublished: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

function getDatasetDisplayStatus(
  row: Pick<ConsoleDatasetItem, "squarePublishStatus" | "publishedToSquare">,
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
  row: Pick<ConsoleDatasetItem, "squarePublishStatus" | "publishedToSquare">;
  onRejectReasonClick?: () => void;
}) {
  const { t } = useI18n();
  const status = getDatasetDisplayStatus(row);
  const label = t(statusLabelKeys[status] ?? status);
  const variant = statusVariantMap[status] ?? "secondary";

  if (status === "rejected" && onRejectReasonClick) {
    return (
      <Badge
        variant={variant}
        className={`${statusClassName[status]} cursor-pointer`}
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

const DatasetsIndexPage = () => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [debouncedName] = useDebounceValue(name.trim(), 300);
  const [queryParams, setQueryParams] = useState<QueryConsoleDatasetsDto>({
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const [reviewDataset, setReviewDataset] = useState<ConsoleDatasetItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [vectorDataset, setVectorDataset] = useState<ConsoleDatasetItem | null>(null);
  const [vectorOpen, setVectorOpen] = useState(false);
  const [documentDataset, setDocumentDataset] = useState<ConsoleDatasetItem | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [memberDataset, setMemberDataset] = useState<ConsoleDatasetItem | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const { confirm: alertConfirm } = useAlertDialog();
  const { data, isLoading, refetch } = useConsoleDatasetsListQuery(queryParams);
  const deleteMutation = useDeleteDatasetMutation({
    onSuccess: () => {
      toast.success(t("ai.dataset.list.actions.delete"));
      refetch();
    },
    onError: (e) => toast.error(`${t("ai.dataset.list.actions.delete")} failed: ${e.message}`),
  });
  const publishMutation = usePublishDatasetSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.dataset.list.actions.publishBtn"));
      refetch();
    },
  });
  const unpublishMutation = useUnpublishDatasetSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.dataset.list.actions.unpublishBtn"));
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (value as QueryConsoleDatasetsDto["status"]),
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

  const handleReview = (row: ConsoleDatasetItem) => {
    setReviewDataset(row);
    setReviewOpen(true);
  };

  const handleRejectReasonClick = (reason: string | null | undefined) => {
    alertConfirm({
      title: t("ai.dataset.list.confirm.rejectTitle"),
      description: reason?.trim() ? reason : t("ai.dataset.list.confirm.rejectDesc"),
      confirmText: t("ai.dataset.list.confirm.rejectConfirm"),
    }).catch(() => {});
  };
  const handleDelete = async (row: ConsoleDatasetItem) => {
    try {
      await alertConfirm({
        title: t("ai.dataset.list.confirm.deleteTitle"),
        description: t("ai.dataset.list.confirm.deleteDesc", { name: row.name }),
        confirmText: t("ai.dataset.list.actions.deleteBtn"),
        confirmVariant: "destructive",
      });
      deleteMutation.mutate(row.id);
    } catch {
      // 用户取消
    }
  };
  const handlePublish = async (row: ConsoleDatasetItem) => {
    try {
      await alertConfirm({
        title: t("ai.dataset.list.confirm.publishTitle"),
        description: t("ai.dataset.list.confirm.publishDesc", { name: row.name }),
        confirmText: t("ai.dataset.list.actions.publishBtn"),
      });
      publishMutation.mutate(row.id);
    } catch {
      // 用户取消
    }
  };
  const handleUnpublish = async (row: ConsoleDatasetItem) => {
    try {
      await alertConfirm({
        title: t("ai.dataset.list.confirm.unpublishTitle"),
        description: t("ai.dataset.list.confirm.unpublishDesc", { name: row.name }),
        confirmText: t("ai.dataset.list.actions.unpublishBtn"),
      });
      unpublishMutation.mutate(row.id);
    } catch {
      // 用户取消
    }
  };
  const handleVector = (row: ConsoleDatasetItem) => {
    setVectorDataset(row);
    setVectorOpen(true);
  };
  const handleDocument = (row: ConsoleDatasetItem) => {
    setDocumentDataset(row);
    setDocumentOpen(true);
  };
  const handleMember = (row: ConsoleDatasetItem) => {
    setMemberDataset(row);
    setMemberOpen(true);
  };

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.total ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.dataset.list.stat.totalDatasets")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.pending ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.dataset.list.stat.pendingReview")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.published ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.dataset.list.stat.publishedDatasets")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.private ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.dataset.list.stat.privateDatasets")}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{data?.extend?.unpublished ?? 0}</div>
            <div className="text-muted-foreground text-xs">
              {t("ai.dataset.list.stat.offlineDatasets")}
            </div>
          </div>
        </div>
        <div className="bg-background sticky top-0 z-2 mb-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder={t("ai.dataset.list.searchPlaceholder")}
            className="text-sm"
            value={name}
            onChange={handleNameChange}
          />
          <Select value={queryParams.status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("ai.dataset.list.status.all")} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value ?? "all"} value={opt.value ?? "all"}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TagSelect
            type={"dataset" as TagTypeType}
            value={queryParams.tagId ? [queryParams.tagId] : []}
            onChange={handleTagIdsChange}
            placeholder={t("dataset.list.searchTags")}
          />
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("ai.dataset.list.table.dataset")}</TableHead>
                <TableHead>{t("ai.dataset.list.table.creator")}</TableHead>
                <TableHead>{t("ai.dataset.list.table.tags")}</TableHead>
                <TableHead className="text-center">
                  {t("ai.dataset.list.table.documents")}
                </TableHead>
                <TableHead>{t("ai.dataset.list.table.storage")}</TableHead>
                <TableHead>{t("ai.dataset.list.table.status")}</TableHead>
                <TableHead className="text-center">{t("ai.dataset.list.table.sort")}</TableHead>
                <TableHead>{t("ai.dataset.list.table.lastEdited")}</TableHead>
                <PermissionGuard
                  permissions={[
                    "datasets-documents:list",
                    "datasets-members:list",
                    "datasets:review",
                    "datasets:publish",
                    "datasets:unpublish",
                    "datasets:delete",
                    "datasets:vector-config",
                  ]}
                  any
                >
                  <TableHead>{t("ai.dataset.list.table.action")}</TableHead>
                </PermissionGuard>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                    {t("ai.dataset.list.empty.loading")}
                  </TableCell>
                </TableRow>
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                    {t("ai.dataset.list.empty.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8 rounded-md after:rounded-md">
                          <AvatarImage src={row.coverUrl} className="rounded-md" />
                          <AvatarFallback className="rounded-md">
                            <BookOpen className="text-primary size-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {row.creatorName}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[120px] flex-wrap gap-1">
                        {(row.tags ?? []).length > 0 ? (
                          (row.tags ?? []).map((t) => (
                            <Badge
                              key={t.id}
                              variant="secondary"
                              className="truncate text-xs font-normal"
                            >
                              {t.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{row.documentCount}</TableCell>
                    <TableCell>{row.storageSizeFormatted}</TableCell>
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
                    <TableCell className="text-center">{row.sort}</TableCell>
                    <TableCell>
                      <TimeText value={row.updatedAt} variant="datetime" />
                    </TableCell>
                    <PermissionGuard
                      permissions={[
                        "datasets-documents:list",
                        "datasets-members:list",
                        "datasets:review",
                        "datasets:publish",
                        "datasets:unpublish",
                        "datasets:delete",
                        "datasets:vector-config",
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
                            <PermissionGuard permissions="datasets-documents:list">
                              <DropdownMenuItem onSelect={() => handleDocument(row)}>
                                <FileText className="mr-2 size-4" />
                                {t("ai.dataset.list.actions.documents")}
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard permissions="datasets-members:list">
                              <DropdownMenuItem onSelect={() => handleMember(row)}>
                                <Users className="mr-2 size-4" />
                                {t("ai.dataset.list.actions.members")}
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard permissions="datasets:review">
                              {row.squarePublishStatus === "pending" && (
                                <DropdownMenuItem onSelect={() => handleReview(row)}>
                                  <FileCheck className="mr-2 size-4" />
                                  {t("ai.dataset.list.actions.review")}
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="datasets:publish">
                              {row.squarePublishStatus === "approved" && !row.publishedToSquare && (
                                <DropdownMenuItem onSelect={() => handlePublish(row)}>
                                  <ArrowUpToLine className="mr-2 size-4" />
                                  {t("ai.dataset.list.actions.online")}
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="datasets:unpublish">
                              {row.squarePublishStatus === "approved" && row.publishedToSquare && (
                                <DropdownMenuItem onSelect={() => handleUnpublish(row)}>
                                  <ArrowDownToLine className="mr-2 size-4" />
                                  {t("ai.dataset.list.actions.offline")}
                                </DropdownMenuItem>
                              )}
                            </PermissionGuard>
                            <PermissionGuard permissions="datasets:delete">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={
                                  deleteMutation.isPending ||
                                  publishMutation.isPending ||
                                  unpublishMutation.isPending
                                }
                                onSelect={() => handleDelete(row)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                {t("ai.dataset.list.actions.delete")}
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard permissions="datasets:vector-config">
                              <DropdownMenuItem onSelect={() => handleVector(row)}>
                                <Layers className="mr-2 size-4" />
                                {t("ai.dataset.list.actions.vector")}
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
      {reviewOpen && (
        <ReviewDialog
          open
          onOpenChange={setReviewOpen}
          dataset={reviewDataset}
          onSuccess={() => refetch()}
        />
      )}
      <VectorConfigDialog
        open={vectorOpen}
        onOpenChange={setVectorOpen}
        datasetId={vectorDataset?.id ?? null}
        datasetName={vectorDataset?.name ?? ""}
        onSuccess={() => refetch()}
      />
      {documentOpen && documentDataset && (
        <DocumentDialog
          open={documentOpen}
          onOpenChange={setDocumentOpen}
          datasetId={documentDataset.id}
          datasetName={documentDataset.name}
        />
      )}
      {memberOpen && memberDataset && (
        <MemberDialog
          open={memberOpen}
          onOpenChange={setMemberOpen}
          datasetId={memberDataset.id}
          datasetName={memberDataset.name}
        />
      )}
    </PageContainer>
  );
};

export default DatasetsIndexPage;
