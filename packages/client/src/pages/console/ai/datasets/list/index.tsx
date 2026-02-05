import {
  type ConsoleDatasetItem,
  type QueryConsoleDatasetsDto,
  useConsoleDatasetsListQuery,
  useDeleteDatasetMutation,
} from "@buildingai/services/console";
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
import { BookOpen, EllipsisVertical, FileCheck, Info, Layers, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/hooks/use-pagination";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { ReviewDialog } from "./_components/review-dialog";
import { VectorConfigDialog } from "./_components/vector-config-dialog";

const PAGE_SIZE = 30;

const STATUS_OPTIONS: { value: QueryConsoleDatasetsDto["status"]; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "审核失败" },
  { value: "none", label: "私有" },
  { value: "approved", label: "已公开" },
];

const statusLabelMap: Record<string, string> = {
  pending: "待审核",
  rejected: "审核失败",
  none: "私有",
  approved: "已公开",
};

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
> = {
  pending: "secondary",
  rejected: "destructive",
  none: "outline",
  approved: "default",
};

function StatusBadge({
  status,
  onRejectReasonClick,
}: {
  status: string;
  onRejectReasonClick?: () => void;
}) {
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
  return <Badge variant={variant}>{label}</Badge>;
}

const DatasetsIndexPage = () => {
  const [queryParams, setQueryParams] = useState<QueryConsoleDatasetsDto>({
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const [reviewDataset, setReviewDataset] = useState<ConsoleDatasetItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [vectorDataset, setVectorDataset] = useState<ConsoleDatasetItem | null>(null);
  const [vectorOpen, setVectorOpen] = useState(false);
  const { confirm: alertConfirm } = useAlertDialog();
  const { data, isLoading, refetch } = useConsoleDatasetsListQuery(queryParams);
  const deleteMutation = useDeleteDatasetMutation({
    onSuccess: () => {
      toast.success("已删除");
      refetch();
    },
    onError: (e) => toast.error(`删除失败: ${e.message}`),
  });

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize: PAGE_SIZE,
    page: queryParams.page ?? 1,
    onPageChange: (page) => setQueryParams((prev) => ({ ...prev, page })),
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQueryParams((prev) => ({
      ...prev,
      name: value.trim() || undefined,
      page: 1,
    }));
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (value as QueryConsoleDatasetsDto["status"]),
      page: 1,
    }));
  };

  const handleDetail = (row: ConsoleDatasetItem) => {
    console.log("detail", row.id);
  };
  const handleReview = (row: ConsoleDatasetItem) => {
    setReviewDataset(row);
    setReviewOpen(true);
  };

  const handleRejectReasonClick = (reason: string | null | undefined) => {
    alertConfirm({
      title: "拒绝原因",
      description: reason?.trim() ? reason : "未填写拒绝原因",
      confirmText: "确定",
    }).catch(() => {});
  };
  const handleDelete = async (row: ConsoleDatasetItem) => {
    try {
      await alertConfirm({
        title: "删除知识库",
        description: `确定要删除「${row.name}」吗？将同时删除其下所有文档与对话记录，此操作不可恢复。`,
        confirmText: "删除",
        confirmVariant: "destructive",
      });
      deleteMutation.mutate(row.id);
    } catch {
      // 用户取消
    }
  };
  const handleVector = (row: ConsoleDatasetItem) => {
    setVectorDataset(row);
    setVectorOpen(true);
  };

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="bg-background sticky top-0 z-1 mb-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="请输入知识库名称"
            className="text-sm"
            value={queryParams.name ?? ""}
            onChange={handleNameChange}
          />
          <Select value={queryParams.status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[140px]">
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
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>知识库</TableHead>
                <TableHead>创建人</TableHead>
                <TableHead className="text-center">文档数量</TableHead>
                <TableHead>存储空间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-center">排序</TableHead>
                <TableHead>最近编辑</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground h-32 text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground h-32 text-center">
                    暂无知识库数据
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                          <BookOpen className="text-primary size-4" />
                        </div>
                        <span className="truncate font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {row.creatorName}
                    </TableCell>
                    <TableCell className="text-center">{row.documentCount}</TableCell>
                    <TableCell>{row.storageSizeFormatted}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={row.squarePublishStatus}
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleDetail(row)}>
                            <User className="mr-2 size-4" />
                            详情
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={row.squarePublishStatus !== "pending"}
                            onSelect={() => handleReview(row)}
                          >
                            <FileCheck className="mr-2 size-4" />
                            审核
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={deleteMutation.isPending}
                            onSelect={() => handleDelete(row)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            删除
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleVector(row)}>
                            <Layers className="mr-2 size-4" />
                            向量
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
    </PageContainer>
  );
};

export default DatasetsIndexPage;
