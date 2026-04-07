import { useI18n } from "@buildingai/i18n";
import {
  type MembershipStatistics,
  type QueryMembershipOrderDto,
  useMembershipOrderListQuery,
  useRefundMembershipOrderMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
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
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@buildingai/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea, ScrollBar } from "@buildingai/ui/components/ui/scroll-area";
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
import { cn } from "@buildingai/ui/lib/utils";
import { EyeIcon, MoreHorizontalIcon, RotateCcwIcon, Undo2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { DataTableFacetedFilter } from "./_components/data-table-faceted-filter";
import { OrderDetailDialog } from "./_components/order-detail-dialog";

const statisticsItems = [
  {
    key: "totalOrder",
    label: "financial.order.memberStatistics.totalOrder",
    unit: "financial.order.memberStatistics.unit",
  },
  {
    key: "totalAmount",
    label: "financial.order.memberStatistics.totalAmount",
    unit: "financial.order.memberStatistics.currency",
  },
  {
    key: "totalRefundOrder",
    label: "financial.order.memberStatistics.totalRefundOrder",
    unit: "financial.order.memberStatistics.unit",
  },
  {
    key: "totalRefundAmount",
    label: "financial.order.memberStatistics.totalRefundAmount",
    unit: "financial.order.memberStatistics.currency",
  },
  {
    key: "totalIncome",
    label: "financial.order.memberStatistics.netIncome",
    unit: "financial.order.memberStatistics.currency",
  },
];

const paymentStatusOptions = [
  {
    label: "financial.order.status.paid",
    value: "1",
  },
  {
    label: "financial.order.status.unpaid",
    value: "0",
  },
];

const refundStatusOptions = [
  {
    label: "financial.order.status.refunded",
    value: "1",
  },
  {
    label: "financial.order.notRefundedLabel",
    value: "0",
  },
];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(val);
}

const OrderMembershipIndexPage = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | undefined>(undefined);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | undefined>(undefined);
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>(undefined);
  const [orderNoSearch, setOrderNoSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedOrderNoSearch] = useDebounceValue(orderNoSearch.trim(), 300);
  const [debouncedUserSearch] = useDebounceValue(userSearch.trim(), 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statistics, setStatistics] = useState<MembershipStatistics>({
    totalAmount: 0,
    totalIncome: 0,
    totalOrder: 0,
    totalRefundAmount: 0,
    totalRefundOrder: 0,
  });

  const hasActiveFilters = useMemo(() => {
    return (
      paymentStatusFilter !== undefined ||
      paymentMethodFilter !== undefined ||
      refundStatusFilter !== undefined ||
      debouncedOrderNoSearch !== "" ||
      debouncedUserSearch !== ""
    );
  }, [
    paymentStatusFilter,
    paymentMethodFilter,
    refundStatusFilter,
    debouncedOrderNoSearch,
    debouncedUserSearch,
  ]);

  const translatedPaymentStatusOptions = useMemo(
    () => [
      { label: t("financial.order.status.paid"), value: "1" },
      { label: t("financial.order.status.unpaid"), value: "0" },
    ],
    [t],
  );

  const translatedRefundStatusOptions = useMemo(
    () => [
      { label: t("financial.order.status.refunded"), value: "1" },
      { label: t("financial.order.notRefundedLabel"), value: "0" },
    ],
    [t],
  );

  const handleResetFilters = () => {
    setPaymentStatusFilter(undefined);
    setPaymentMethodFilter(undefined);
    setRefundStatusFilter(undefined);
    setOrderNoSearch("");
    setUserSearch("");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedOrderNoSearch,
    debouncedUserSearch,
    paymentStatusFilter,
    paymentMethodFilter,
    refundStatusFilter,
  ]);

  const queryParams = useMemo<QueryMembershipOrderDto>(
    () => ({
      page: currentPage,
      pageSize: 25,
      userKeyword: debouncedUserSearch || undefined,
      orderNo: debouncedOrderNoSearch || undefined,
      payType: paymentMethodFilter,
      payState: paymentStatusFilter,
      refundState: refundStatusFilter,
    }),
    [
      currentPage,
      debouncedUserSearch,
      debouncedOrderNoSearch,
      paymentMethodFilter,
      paymentStatusFilter,
      refundStatusFilter,
    ],
  );

  const { data, refetch, isLoading } = useMembershipOrderListQuery(queryParams);

  const extend = data?.extend;
  const paymentMethodOptions = useMemo(() => {
    const payTypeLists =
      (extend as { payTypeLists: { name: string; payType: string }[] })?.payTypeLists || [];
    setStatistics(
      extend?.statistics || {
        totalAmount: 0,
        totalIncome: 0,
        totalOrder: 0,
        totalRefundAmount: 0,
        totalRefundOrder: 0,
      },
    );
    return payTypeLists.map((item: { name: string; payType: string }) => ({
      label: item.name,
      value: item.payType,
    }));
  }, [extend]);

  const { PaginationComponent } = usePagination({
    total: data?.total || 0,
    pageSize: 25,
    page: currentPage,
    onPageChange: (page) => {
      setCurrentPage(page);
    },
  });

  const refundMutation = useRefundMembershipOrderMutation({
    onSuccess: () => {
      toast.success(t("financial.order.refundSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("financial.order.refundFailed", { message: error.message }));
    },
  });

  const handleRefund = async (id: string) => {
    await confirm({
      title: t("financial.order.refundConfirmTitle"),
      description: t("financial.order.refundConfirmDescription"),
      confirmVariant: "destructive",
    });
    await refundMutation.mutateAsync(id);
  };

  return (
    <PageContainer className="md:h-inset mx-0">
      <div className="flex h-full w-full flex-col">
        <div className="grid grid-cols-1 gap-4 px-4 pt-px md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {statisticsItems.map((item, index) => (
            <Card key={index} className="justify-center">
              <CardContent>
                <CardTitle className="text-center">
                  <span className="text-2xl font-bold">
                    {statistics[item.key as keyof MembershipStatistics]}
                  </span>
                  <span className="text-muted-foreground ml-1 text-xs">{t(item.unit)}</span>
                </CardTitle>
                <CardDescription className="text-center">{t(item.label)}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden px-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={t("financial.order.searchOrderNo")}
              value={orderNoSearch}
              onChange={(e) => setOrderNoSearch(e.target.value)}
              className="h-8 w-[200px]"
            />
            <Input
              placeholder={t("financial.order.searchUserIdNicknamePhone")}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 w-[200px]"
            />
            <DataTableFacetedFilter
              title={t("financial.order.paymentStatus")}
              options={translatedPaymentStatusOptions}
              selectedValue={paymentStatusFilter}
              onSelectionChange={setPaymentStatusFilter}
            />
            <DataTableFacetedFilter
              title={t("financial.order.paymentMethod")}
              options={paymentMethodOptions}
              selectedValue={paymentMethodFilter}
              onSelectionChange={setPaymentMethodFilter}
            />
            <DataTableFacetedFilter
              title={t("financial.order.refundStatus")}
              options={translatedRefundStatusOptions}
              selectedValue={refundStatusFilter}
              onSelectionChange={setRefundStatusFilter}
            />
            {hasActiveFilters && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <RotateCcwIcon className="mr-2 size-4" />
                    {t("financial.order.clearFilters")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("financial.order.clearFiltersTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("financial.order.clearFiltersDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("financial.order.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetFilters}>
                      {t("financial.order.clear")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <ScrollArea className="flex h-full flex-1 overflow-hidden rounded-lg">
            <Table className="h-full">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>{t("financial.order.table.orderNo")}</TableHead>
                  <TableHead>{t("financial.order.table.user")}</TableHead>
                  <TableHead>{t("financial.order.table.memberPackage")}</TableHead>
                  <TableHead>{t("financial.order.table.memberLevel")}</TableHead>
                  <TableHead>{t("financial.order.table.memberDuration")}</TableHead>
                  <TableHead>{t("financial.order.table.paidAmount")}</TableHead>
                  <TableHead>{t("financial.order.table.paymentMethod")}</TableHead>
                  <TableHead>{t("financial.order.table.paymentStatus")}</TableHead>
                  <TableHead>{t("financial.order.table.orderTime")}</TableHead>
                  <PermissionGuard
                    permissions={["membership-order:detail", "membership-order:refund"]}
                    any
                  >
                    <TableHead>{t("financial.order.table.operation")}</TableHead>
                  </PermissionGuard>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                      {t("financial.order.loadingTable")}
                    </TableCell>
                  </TableRow>
                ) : !data?.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? t("financial.order.noResultsTable")
                        : t("financial.order.noDataTable")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="w-[100px] font-medium">{item.orderNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 rounded-lg after:rounded-lg">
                            <AvatarImage
                              src={item.user?.avatar || ""}
                              alt={item.user?.nickname || undefined}
                              className="rounded-lg"
                            />
                            <AvatarFallback className="rounded-lg">
                              {item.user?.nickname?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="max-w-[120px] truncate">{item.user?.nickname}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.plan?.name || "-"}</TableCell>
                      <TableCell>{item.level?.name || "-"}</TableCell>
                      <TableCell>{item.duration || "-"}</TableCell>
                      <TableCell>{formatCurrency(item.orderAmount)}</TableCell>
                      <TableCell>{item.payTypeDesc}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            item.payState === 1
                              ? item.refundStatus === 0
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
                          )}
                        >
                          {item.payState === 1
                            ? item.refundStatus === 0
                              ? t("financial.order.status.paid")
                              : t("financial.order.status.refunded")
                            : t("financial.order.status.unpaid")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TimeText value={item.createdAt} variant="datetime" />
                      </TableCell>
                      <PermissionGuard
                        permissions={["membership-order:detail", "membership-order:refund"]}
                        any
                      >
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <PermissionGuard permissions="membership-order:detail">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setDetailOrderId(item.id);
                                    setDetailOpen(true);
                                  }}
                                >
                                  <EyeIcon className="mr-2 size-4" />
                                  {t("financial.order.viewDetails")}
                                </DropdownMenuItem>
                              </PermissionGuard>
                              {item.payState === 1 && item.refundStatus === 0 && (
                                <PermissionGuard permissions="membership-order:refund">
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      handleRefund(item.id);
                                    }}
                                  >
                                    <Undo2Icon className="mr-2 size-4" />
                                    {t("financial.order.applyRefund")}
                                  </DropdownMenuItem>
                                </PermissionGuard>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </PermissionGuard>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <div className="bg-background sticky bottom-0 z-2 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>

        <OrderDetailDialog
          open={detailOpen}
          orderId={detailOrderId}
          onOpenChange={(open: boolean) => {
            setDetailOpen(open);
            if (!open) setDetailOrderId(null);
          }}
          onRefundSuccess={async () => {
            if (detailOrderId) {
              await refundMutation.mutateAsync(detailOrderId);
            }
            refetch();
            setDetailOpen(false);
            setDetailOrderId(null);
          }}
        />
      </div>
    </PageContainer>
  );
};

export default OrderMembershipIndexPage;
