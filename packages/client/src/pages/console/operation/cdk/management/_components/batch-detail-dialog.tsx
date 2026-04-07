import { useI18n } from "@buildingai/i18n";
import {
  CardKeyStatus,
  type QueryCardKeyDto,
  useBatchCardKeysQuery,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { DataTableFacetedFilter } from "@buildingai/ui/components/ui/data-table-faceted-filter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type BatchDetailDialogProps = {
  batchId: string | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * 批次详情对话框 - 显示批次下的卡密列表
 */
export function BatchDetailDialog({ batchId, onOpenChange }: BatchDetailDialogProps) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);

  const statusOptions = [
    { label: t("operation.cdk.management.status.unused"), value: String(CardKeyStatus.UNUSED) },
    { label: t("operation.cdk.management.status.used"), value: String(CardKeyStatus.USED) },
    { label: t("operation.cdk.management.status.expired"), value: String(CardKeyStatus.EXPIRED) },
  ];

  const statusMap = {
    [CardKeyStatus.UNUSED]: {
      label: t("operation.cdk.management.status.unused"),
      variant: "default" as const,
    },
    [CardKeyStatus.USED]: {
      label: t("operation.cdk.management.status.used"),
      variant: "secondary" as const,
    },
    [CardKeyStatus.EXPIRED]: {
      label: t("operation.cdk.management.status.expired"),
      variant: "destructive" as const,
    },
  };
  const [keyCodeSearch, setKeyCodeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const pageSize = 15;

  const queryParams = useMemo<QueryCardKeyDto>(
    () => ({
      page,
      pageSize,
      keyCode: keyCodeSearch.trim() || undefined,
      status: statusFilter ? Number(statusFilter) : undefined,
    }),
    [page, pageSize, keyCodeSearch, statusFilter],
  );

  const { data, isLoading } = useBatchCardKeysQuery(batchId || "", queryParams, {
    enabled: !!batchId,
  });

  const handleClose = () => {
    setPage(1);
    setKeyCodeSearch("");
    setStatusFilter(undefined);
    onOpenChange(false);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <Dialog open={!!batchId} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-hidden lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>{t("operation.cdk.management.batchDetails")}</DialogTitle>
          <DialogDescription>
            {data?.extends && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.batchNo")}：
                  </span>
                  <span className="font-medium">{data.extends.batchNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.batchName")}：
                  </span>
                  <span className="font-medium">{data.extends.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.redeemType")}：
                  </span>
                  <span className="font-medium">
                    {data.extends.redeemType === 1
                      ? t("operation.cdk.management.redeemType.membership")
                      : t("operation.cdk.management.redeemType.points")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.redeemContent")}：
                  </span>
                  <span className="font-medium">{data.extends.redeemContent}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.expireTime")}：
                  </span>
                  <span className="font-medium">
                    <TimeText value={data.extends.expireAt} format="YYYY年MM月DD日 HH:mm" />
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.totalCount")}：
                  </span>
                  <span className="font-medium">{data.extends.totalCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.usedCount")}：
                  </span>
                  <span className="font-medium">{data.extends.usedCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("operation.cdk.management.remainingCount")}：
                  </span>
                  <span className="font-medium">{data.extends.remainingCount}</span>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={t("operation.cdk.management.searchCode")}
              className="h-8 w-full md:w-50"
              value={keyCodeSearch}
              onChange={(e) => {
                setKeyCodeSearch(e.target.value);
                setPage(1);
              }}
            />
            <DataTableFacetedFilter
              className="h-8"
              title={t("operation.cdk.management.status")}
              options={statusOptions}
              selectedValue={statusFilter}
              onSelectionChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          </div>

          <ScrollArea className="h-[400px] rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>{t("operation.cdk.management.keyCode")}</TableHead>
                  <TableHead>{t("operation.cdk.management.status")}</TableHead>
                  <TableHead>{t("operation.cdk.management.user")}</TableHead>
                  <TableHead>{t("operation.cdk.management.usedTime")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("common.common.loading")}
                    </TableCell>
                  </TableRow>
                ) : data?.items && data.items.length > 0 ? (
                  data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.keyCode}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[item.status].variant}>
                          {statusMap[item.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.user ? (
                          <div className="flex items-center gap-2">
                            <Avatar size="sm">
                              <AvatarImage
                                src={item.user?.avatar || ""}
                                alt={item.user?.nickname || ""}
                                className="rounded-lg"
                              />
                              <AvatarFallback>
                                {item.user?.nickname?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{item.user?.nickname}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.usedAt ? (
                          <TimeText value={item.usedAt} format="YYYY/MM/DD HH:mm" />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      {t("common.common.noData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {data && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                {t("common.common.totalPages", { total: data.total, page, totalPages })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                  {t("common.common.prevPage")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t("common.common.nextPage")}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
