import {
  type MembershipStatistics,
  type QueryMembershipOrderDto,
  useMembershipOrderListQuery,
  useRefundMembershipOrderMutation,
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
import { cn } from "@buildingai/ui/lib/utils";
import { EyeIcon, MoreHorizontalIcon, RotateCcwIcon, Undo2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/hooks/use-pagination";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { DataTableFacetedFilter } from "./_components/data-table-faceted-filter";
import { OrderDetailDialog } from "./_components/order-detail-dialog";

const statisticsItems = [
  {
    key: "totalOrder",
    label: "会员订单数",
    unit: "单",
  },
  {
    key: "totalAmount",
    label: "累计充值金额",
    unit: "元",
  },
  {
    key: "totalRefundOrder",
    label: "退款订单数",
    unit: "单",
  },
  {
    key: "totalRefundAmount",
    label: "累计退款金额",
    unit: "元",
  },
  {
    key: "totalIncome",
    label: "净收入",
    unit: "元",
  },
];

const paymentStatusOptions = [
  {
    label: "已支付",
    value: "1",
  },
  {
    label: "未支付",
    value: "0",
  },
];

const refundStatusOptions = [
  {
    label: "已退款",
    value: "1",
  },
  {
    label: "未退款",
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
  const { confirm } = useAlertDialog();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | undefined>(undefined);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | undefined>(undefined);
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>(undefined);
  const [orderNoSearch, setOrderNoSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
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
      orderNoSearch.trim() !== "" ||
      userSearch.trim() !== ""
    );
  }, [paymentStatusFilter, paymentMethodFilter, refundStatusFilter, orderNoSearch, userSearch]);

  const handleResetFilters = () => {
    setPaymentStatusFilter(undefined);
    setPaymentMethodFilter(undefined);
    setRefundStatusFilter(undefined);
    setOrderNoSearch("");
    setUserSearch("");
  };

  const queryParams = useMemo<QueryMembershipOrderDto>(
    () => ({
      page: 1,
      pageSize: 25,
      userKeyword: userSearch || undefined,
      orderNo: orderNoSearch || undefined,
      payType: paymentMethodFilter,
      payState: paymentStatusFilter,
      refundState: refundStatusFilter,
    }),
    [userSearch, orderNoSearch, paymentMethodFilter, paymentStatusFilter, refundStatusFilter],
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
    page: queryParams.page || 1,
    onPageChange: (page) => {
      queryParams.page = page;
      refetch();
    },
  });

  const refundMutation = useRefundMembershipOrderMutation({
    onSuccess: () => {
      toast.success("退款成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`退款失败: ${error.message}`);
    },
  });

  const handleRefund = async (id: string) => {
    await confirm({
      title: "退款确认",
      description: "确定要退款吗？",
      confirmVariant: "destructive",
    });
    await refundMutation.mutateAsync(id);
  };

  return (
    <PageContainer className="h-[calc(100vh-6.25rem)]">
      <div className="flex h-full w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 pt-px md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {statisticsItems.map((item, index) => (
            <Card key={index} className="justify-center">
              <CardContent>
                <CardTitle className="text-center">
                  <span className="text-2xl font-bold">
                    {statistics[item.key as keyof MembershipStatistics]}
                  </span>
                  <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
                </CardTitle>
                <CardDescription className="text-center">{item.label}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-1">
            <Input
              placeholder="搜索订单号"
              value={orderNoSearch}
              onChange={(e) => setOrderNoSearch(e.target.value)}
              className="h-8 w-[200px]"
            />
            <Input
              placeholder="搜索用户ID/昵称/手机号"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 w-[200px]"
            />
            <DataTableFacetedFilter
              title="支付状态"
              options={paymentStatusOptions}
              selectedValue={paymentStatusFilter}
              onSelectionChange={setPaymentStatusFilter}
            />
            <DataTableFacetedFilter
              title="支付方式"
              options={paymentMethodOptions}
              selectedValue={paymentMethodFilter}
              onSelectionChange={setPaymentMethodFilter}
            />
            <DataTableFacetedFilter
              title="退款状态"
              options={refundStatusOptions}
              selectedValue={refundStatusFilter}
              onSelectionChange={setRefundStatusFilter}
            />
            {hasActiveFilters && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <RotateCcwIcon className="mr-2 size-4" />
                    清除筛选
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>清除所有筛选？</AlertDialogTitle>
                    <AlertDialogDescription>
                      这将清除所有已设置的筛选条件，包括搜索输入和筛选选项。此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetFilters}>清除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <ScrollArea className="flex h-full flex-1 overflow-hidden rounded-md">
            <Table className="h-full">
              <TableHeader className="bg-muted sticky top-0 z-10 border">
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>会员套餐</TableHead>
                  <TableHead>会员等级</TableHead>
                  <TableHead>会员时长</TableHead>
                  <TableHead>实付金额</TableHead>
                  <TableHead>支付方式</TableHead>
                  <TableHead>支付状态</TableHead>
                  <TableHead>下单时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : !data?.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? "没有找到符合条件的订单，请尝试调整筛选条件"
                        : "暂无会员订单数据"}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="w-[100px] font-medium">{item.orderNo}</TableCell>
                      <TableCell>{item.user?.nickname || item.user?.username || "-"}</TableCell>
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
                              ? "已支付"
                              : "已退款"
                            : "未支付"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TimeText value={item.createdAt} variant="datetime" />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setDetailOrderId(item.id);
                                setDetailOpen(true);
                              }}
                            >
                              <EyeIcon className="mr-2 size-4" />
                              查看详情
                            </DropdownMenuItem>
                            {item.payState === 1 && item.refundStatus === 0 && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                  handleRefund(item.id);
                                }}
                              >
                                <Undo2Icon className="mr-2 size-4" />
                                退款
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <div className="bg-background sticky bottom-0 flex py-2">
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
