import { useI18n } from "@buildingai/i18n";
import type { OrderDetailData } from "@buildingai/services/console";
import { useRechargeOrderDetailQuery } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { CheckIcon, Clock4Icon, Undo2Icon } from "lucide-react";
import { useRef } from "react";

interface OrderDetailDialogProps {
  open: boolean;
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onRefundSuccess: () => void;
}

function formatAmount(val: number) {
  return Number(val).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const OrderDetailDialog = ({
  open,
  orderId,
  onOpenChange,
  onRefundSuccess,
}: OrderDetailDialogProps) => {
  const { t } = useI18n();
  const lastOrderRef = useRef<OrderDetailData | null>(null);
  const { confirm } = useAlertDialog();

  const {
    data: order,
    isLoading,
    isError,
  } = useRechargeOrderDetailQuery(orderId || "", {
    enabled: open && !!orderId,
  });

  if (order && !isLoading && !isError) {
    lastOrderRef.current = order;
  }

  const displayOrder = order ?? (open ? null : lastOrderRef.current);
  const isPaid =
    displayOrder &&
    (displayOrder.paymentStatus === t("financial.order.status.paid") ||
      displayOrder.payStatus === 1);
  const isRefunded = !!displayOrder && displayOrder.refundStatus === 1;
  const headerStatus: "refunded" | "paid" | "pending" = isRefunded
    ? "refunded"
    : isPaid
      ? "paid"
      : "pending";

  const handleRefund = async () => {
    if (!orderId) return;
    await confirm({
      title: t("financial.order.refundConfirmTitle"),
      description: t("financial.order.refundConfirmDescription"),
      confirmVariant: "destructive",
    });
    onRefundSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{t("financial.order.orderDetails")}</DialogTitle>
        </DialogHeader>
        {isLoading && !!orderId && (
          <div className="text-muted-foreground flex items-center justify-center py-16 text-sm">
            {t("financial.order.loadingTable")}
          </div>
        )}
        {isError && !!orderId && (
          <div className="text-destructive flex items-center justify-center py-16 text-sm">
            {t("financial.order.loadFailed") || "Failed to load, please try again later"}
          </div>
        )}
        {displayOrder && (
          <>
            <div className="flex flex-col items-center px-6 pt-8 pb-6">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  headerStatus === "paid"
                    ? "bg-green-500 text-white"
                    : headerStatus === "refunded"
                      ? "bg-yellow-500 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {headerStatus === "paid" ? (
                  <CheckIcon className="size-6" />
                ) : headerStatus === "refunded" ? (
                  <Undo2Icon className="size-6" />
                ) : (
                  <Clock4Icon className="size-6" />
                )}
              </div>
              <h2 className="text-foreground mt-4 text-xl font-semibold">
                {headerStatus === "paid"
                  ? t("financial.order.paymentCompleted")
                  : headerStatus === "refunded"
                    ? t("financial.order.status.refunded")
                    : t("financial.order.pending")}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {t("financial.order.table.orderNo")}:{" "}
                <span className="text-foreground font-medium">{displayOrder.orderNo}</span>
              </p>
            </div>

            <div className="bg-muted/30 grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-4">
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">{t("financial.order.username")}</div>
                <div className="text-sm font-medium">
                  {displayOrder.user?.nickname || displayOrder.user?.username || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">
                  {t("financial.order.orderSource")}
                </div>
                <div className="text-sm font-medium">{displayOrder.terminalDesc}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">
                  {t("financial.order.orderType")}
                </div>
                <div className="text-sm font-medium">{displayOrder.orderType}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">
                  {t("financial.order.paymentMethod")}
                </div>
                <div className="text-sm font-medium">{displayOrder.payTypeDesc || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">
                  {t("financial.order.table.orderTime")}
                </div>
                <div className="text-sm font-medium">
                  <TimeText value={displayOrder.createdAt} variant="datetime" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">
                  {t("financial.order.paymentTime")}
                </div>
                <div className="text-sm font-medium">
                  {isPaid ? (
                    <TimeText
                      value={displayOrder.updatedAt || displayOrder.createdAt}
                      variant="datetime"
                    />
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              {displayOrder.refundNo && (
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">
                    {t("financial.order.refundNo")}
                  </div>
                  <div className="text-sm font-medium">{displayOrder.refundNo}</div>
                </div>
              )}
            </div>

            <div className="bg-card m-4 rounded-lg border p-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("financial.order.rechargeAmount")}
                  </span>
                  <span className="font-medium tabular-nums">{displayOrder.power}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("financial.order.giveAmount")}</span>
                  <span className="font-medium text-green-600 tabular-nums dark:text-green-400">
                    + {displayOrder.givePower}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("financial.order.arrivedAmount")}
                  </span>
                  <span className="font-medium tabular-nums">{displayOrder.totalPower}</span>
                </div>
                <div className="border-border mt-3 border-t border-dashed pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("financial.order.paidAmount")}</span>
                    <span className="text-primary text-lg font-semibold tabular-nums">
                      ¥ {formatAmount(displayOrder.orderAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 pt-0">
              {isPaid && displayOrder.refundStatus !== 1 && (
                <Button type="button" variant="destructive" onClick={handleRefund}>
                  {t("action.applyRefund")}
                </Button>
              )}
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("action.close")}
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
