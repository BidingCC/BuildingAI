"use client";

import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type PayConfigType,
  type PayWayItem,
  type RechargeRuleItem,
  usePayPrepayMutation,
  useSubmitRechargeMutation,
} from "@buildingai/services/web";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { cn } from "@buildingai/ui/lib/utils";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

function formatPrice(amount: number) {
  return `¥${Number(amount).toFixed(2)}`;
}

export function RechargeDetailDialog({
  open,
  onOpenChange,
  rule,
  payWayList = [],
  rechargeExplain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RechargeRuleItem | null;
  payWayList?: PayWayItem[];
  rechargeExplain?: string;
}) {
  const firstPayType = payWayList[0]?.payType ?? 1;
  const [paymentMethod, setPaymentMethod] = useState<PayConfigType>(firstPayType as PayConfigType);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (payWayList.length > 0) {
      setPaymentMethod(
        payWayList.find((item) => item.isDefault === BooleanNumber.YES)?.payType as PayConfigType,
      );
    }
  }, [payWayList.length, payWayList[0]?.payType]);

  useEffect(() => {
    if (!open) {
      setQrCode(null);
      setOrderNo(null);
      setQrLoading(false);
      setQrError(null);
    }
  }, [open]);

  const submitMutation = useSubmitRechargeMutation();
  const prepayMutation = usePayPrepayMutation();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQrCode(null);
      setOrderNo(null);
      setQrLoading(false);
      setQrError(null);
    }
    onOpenChange(next);
  };

  const handleConfirmPay = async () => {
    if (!rule) return;
    try {
      setQrError(null);
      const order = await submitMutation.mutateAsync({
        id: rule.id,
        payType: paymentMethod,
      });
      setOrderNo(order.orderNo);
      setQrLoading(true);
      const prepay = await prepayMutation.mutateAsync({
        orderId: order.orderId,
        payType: paymentMethod,
        from: "recharge",
      });
      const rawQrCode = prepay.qrCode?.code_url;
      if (typeof rawQrCode === "string" && rawQrCode.length > 0) {
        setQrCode(rawQrCode);
        setQrLoading(false);
      } else {
        setQrCode(null);
        setQrLoading(false);
        setQrError("暂未获取到支付二维码，请稍后重试或更换支付方式");
      }
    } catch (e) {
      console.error(e);
      setQrLoading(false);
      setQrError("创建订单或拉起支付失败，请稍后重试");
    }
  };

  const isLoading = submitMutation.isPending || prepayMutation.isPending;
  const showQr = qrCode || orderNo;
  const totalPower = rule ? rule.power + rule.givePower : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{showQr ? "请完成支付" : "积分套餐详情"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          {!rule ? (
            <p className="text-muted-foreground text-sm">请选择套餐</p>
          ) : !showQr ? (
            <>
              <Card className="border-border">
                <CardContent className="px-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">充值数量</span>
                      <span className="font-medium tabular-nums">{rule.power}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">赠送数量</span>
                      <span className="font-medium text-green-600 tabular-nums dark:text-green-400">
                        + {rule.givePower}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">到账数量</span>
                      <span className="font-medium tabular-nums">{totalPower}</span>
                    </div>
                    {rule.label && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">标签</span>
                        <Badge className="bg-primary/10 text-primary text-xs">{rule.label}</Badge>
                      </div>
                    )}
                    <Separator className="border-border border-t border-dashed bg-transparent data-[orientation=horizontal]:h-0" />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">实付金额</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatPrice(rule.sellPrice)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {rechargeExplain && (
                <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {rechargeExplain}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-medium">选择支付方式</h4>
                <RadioGroup
                  orientation="horizontal"
                  value={String(paymentMethod)}
                  onValueChange={(v: string | undefined) =>
                    setPaymentMethod(Number(v) as PayConfigType)
                  }
                  className="flex gap-3"
                >
                  {payWayList.length > 0 &&
                    payWayList.map((way) => (
                      <label
                        key={way.payType}
                        className={cn(
                          "border-input hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                          paymentMethod === way.payType && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value={String(way.payType)} />
                        <div className="flex flex-1 items-center gap-2">
                          <Avatar className="size-6 shrink-0">
                            <AvatarImage
                              src={way.logo ?? ""}
                              alt={way.name}
                              className="object-contain"
                            />
                            <AvatarFallback className="rounded-md">
                              <CreditCard className="text-muted-foreground size-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{way.name}</div>
                        </div>
                      </label>
                    ))}
                </RadioGroup>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-muted-foreground text-sm">订单总额</span>
                <span className="text-xl font-semibold">{formatPrice(rule.sellPrice)}</span>
              </div>
              <Button className="w-full" size="lg" disabled={isLoading} onClick={handleConfirmPay}>
                {isLoading ? "提交中…" : "确认支付"}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              {orderNo && (
                <p className="text-muted-foreground text-sm">
                  订单号：<span className="text-foreground font-medium">{orderNo}</span>
                </p>
              )}
              {qrLoading && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="bg-muted text-muted-foreground flex size-48 items-center justify-center rounded-lg border border-dashed text-sm">
                    正在生成支付二维码…
                  </div>
                </div>
              )}
              {!qrLoading && qrError && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="bg-muted text-destructive flex size-48 items-center justify-center rounded-lg border border-dashed px-3 text-center text-sm">
                    {qrError}
                  </div>
                </div>
              )}
              {!qrLoading && !qrError && typeof qrCode === "string" && (
                <div className="flex flex-col items-center gap-2">
                  {qrCode.startsWith("http") || qrCode.startsWith("data:") ? (
                    <img
                      src={qrCode}
                      alt="支付二维码"
                      className="size-48 object-contain"
                      onError={() => setQrError("二维码加载失败，请刷新页面或稍后重试")}
                    />
                  ) : (
                    <div className="bg-muted flex size-48 items-center justify-center rounded-lg p-2 text-center text-xs break-all">
                      {qrCode}
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm">请使用微信扫码完成支付</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
