import { useI18n } from "@buildingai/i18n";
import {
  CardRedeemType,
  type QueryCardBatchDto,
  useCardBatchListQuery,
  useDeleteCardBatchMutation,
} from "@buildingai/services/console";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@buildingai/ui/components/ui/alert-dialog";
import { Button } from "@buildingai/ui/components/ui/button";
import { Calendar } from "@buildingai/ui/components/ui/calendar";
import { type DateRange } from "@buildingai/ui/components/ui/calendar";
import { DataTableFacetedFilter } from "@buildingai/ui/components/ui/data-table-faceted-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
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
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { format } from "date-fns";
import {
  CalendarIcon,
  ClipboardListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { BatchDetailDialog } from "./_components/batch-detail-dialog";
import { CreateBatchDialog } from "./_components/create-batch-dialog";

const redeemTypeOptions = [
  { value: String(CardRedeemType.MEMBERSHIP), label: "membership" },
  { value: String(CardRedeemType.POINTS), label: "points" },
];

/**
 * 卡密管理页面
 */
export default function CardKeyManagement() {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [page, setPage] = useState(1);
  const [batchNoSearch, setBatchNoSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [redeemTypeFilter, setRedeemTypeFilter] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const pageSize = 15;

  const hasActiveFilters = useMemo(() => {
    return (
      batchNoSearch.trim() !== "" ||
      nameSearch.trim() !== "" ||
      redeemTypeFilter !== undefined ||
      date !== undefined
    );
  }, [batchNoSearch, nameSearch, redeemTypeFilter, date]);

  const handleResetFilters = () => {
    setBatchNoSearch("");
    setNameSearch("");
    setRedeemTypeFilter(undefined);
    setDate(undefined);
    setPage(1);
  };

  const queryParams = useMemo<QueryCardBatchDto>(
    () => ({
      page,
      pageSize,
      batchNo: batchNoSearch.trim() || undefined,
      name: nameSearch.trim() || undefined,
      redeemType: redeemTypeFilter ? Number(redeemTypeFilter) : undefined,
      startTime: date?.from?.toISOString(),
      endTime: date?.to?.toISOString(),
    }),
    [page, pageSize, batchNoSearch, nameSearch, redeemTypeFilter, date],
  );

  const { data, refetch, isLoading } = useCardBatchListQuery(queryParams);
  const deleteMutation = useDeleteCardBatchMutation();

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize,
    page,
    onPageChange: (p) => {
      setPage(p);
      refetch();
    },
  });

  const handleDelete = async (id: string, name: string) => {
    try {
      await confirm({
        title: t("operation.cdk.management.deleteConfirm"),
        description: t("operation.cdk.management.deleteConfirmDesc", { name }),
      });
    } catch {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success(t("operation.cdk.management.deleted"));
      refetch();
    } catch (error: any) {
      toast.error(t("operation.cdk.management.deleteFailed"));
    }
  };

  return (
    <PageContainer>
      <div className="space-y-4 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("operation.cdk.management.searchBatchNo")}
            className="h-8 w-full md:w-40"
            value={batchNoSearch}
            onChange={(e) => {
              setBatchNoSearch(e.target.value);
              setPage(1);
            }}
          />
          <Input
            placeholder={t("operation.cdk.management.searchBatchName")}
            className="h-8 w-full md:w-40"
            value={nameSearch}
            onChange={(e) => {
              setNameSearch(e.target.value);
              setPage(1);
            }}
          />
          <DataTableFacetedFilter
            className="h-8"
            title={t("operation.cdk.management.redeemTypeFilter")}
            options={redeemTypeOptions}
            selectedValue={redeemTypeFilter}
            onSelectionChange={(value) => {
              setRedeemTypeFilter(value);
              setPage(1);
            }}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date-picker-range"
                className="h-8 justify-start px-2.5 font-normal"
              >
                <CalendarIcon />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>{t("operation.cdk.management.dateRangeSelect")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  <RotateCcwIcon className="mr-2 size-4" />
                  {t("operation.cdk.management.clearFilters")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-full md:w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("operation.cdk.management.clearFiltersConfirm")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("operation.cdk.management.clearFiltersDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetFilters}>
                    {t("operation.cdk.management.clearFilters")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="default"
            size="sm"
            className="h-8 lg:ml-auto"
            onClick={() => setCreateDialogOpen(true)}
          >
            <PlusIcon className="mr-2 size-4" />
            {t("operation.cdk.management.addBatch")}
          </Button>
        </div>
        <ScrollArea
          className="flex h-full flex-1 overflow-hidden rounded-lg"
          viewportClassName="[&>div]:block!"
        >
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>{t("operation.cdk.management.table.batchNo")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.name")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.redeemType")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.content")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.usedTotal")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.expireTime")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.remark")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.createTime")}</TableHead>
                <TableHead>{t("operation.cdk.management.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    {t("operation.cdk.management.loading")}
                  </TableCell>
                </TableRow>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                    <TableCell>{batch.name}</TableCell>
                    <TableCell>
                      {batch.redeemType === CardRedeemType.MEMBERSHIP
                        ? t("operation.cdk.management.redeemType.membership")
                        : t("operation.cdk.management.redeemType.points")}
                    </TableCell>
                    <TableCell>{batch.redeemContent}</TableCell>
                    <TableCell>
                      {batch.usedCount}/{batch.totalCount}
                    </TableCell>
                    <TableCell>
                      <TimeText value={batch.expireAt} format="YYYY/MM/DD HH:mm" />
                    </TableCell>
                    <TableCell className="max-w-32 truncate" title={batch.remark}>
                      {batch.remark || "-"}
                    </TableCell>
                    <TableCell>
                      <TimeText value={batch.createdAt} format="YYYY/MM/DD HH:mm" />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailBatchId(batch.id)}>
                            <ClipboardListIcon className="mr-2 size-4" />
                            {t("operation.cdk.management.usageDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(batch.id, batch.name)}
                          >
                            <Trash2Icon className="mr-2 size-4" />
                            {t("operation.cdk.management.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    {t("operation.cdk.management.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {data && data.total > 0 && <PaginationComponent />}
      </div>

      <CreateBatchDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <BatchDetailDialog batchId={detailBatchId} onOpenChange={() => setDetailBatchId(null)} />
    </PageContainer>
  );
}
