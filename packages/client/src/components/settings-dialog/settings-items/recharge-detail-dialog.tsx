"use client";

import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type PayConfigType,
  type PayWayItem,
  type RechargeRuleItem,
  usePayPrepayMutation,
  useRechargePayResultQuery,
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
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CreditCard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const WECHAT_QR_EXPIRE_MS = 60 * 1000;

function formatPrice(amount: number) {
  return `¥${Number(amount).toFixed(2)}`;
}

function buildAlipayReturnUrl(orderId: string, orderNo: string) {
  const url = new URL("/payment/alipay-return", window.location.origin);
  url.searchParams.set("payFrom", "recharge");
  url.searchParams.set("payType", String(PayConfigPayType.ALIPAY));
  url.searchParams.set("payOrderId", orderId);
  url.searchParams.set("payOrderNo", orderNo);
  return url.toString();
}

function openAlipayPopup() {
  const popupWindow = window.open("", "_blank", "width=620,height=720");
  if (!popupWindow) {
    throw new Error("无法打开支付宝支付窗口，请检查浏览器是否拦截了弹窗");
  }
  popupWindow.document.write(
    `<!doctype html><html><head><meta charset="utf-8" /><title>支付宝支付</title></head><body><div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:sans-serif;color:#666;font-size:14px;">正在打开支付宝支付窗口…</div></body></html>`,
  );
  popupWindow.document.close();
  popupWindow.focus();
  return popupWindow;
}

function submitAlipayForm(payForm: string, popupWindow: Window) {
  popupWindow.document.open();
  popupWindow.document.write(payForm);
  popupWindow.document.close();
  popupWindow.focus();
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
  /** 从已开启的支付方式中取默认值：有默认则用默认，否则用第一个 */
  const getDefaultPaymentMethod = (): PayConfigType => {
    if (payWayList.length === 0) return undefined as unknown as PayConfigType;
    const defaultItem = payWayList.find((item) => item.isDefault === BooleanNumber.YES);
    return (defaultItem?.payType ?? payWayList[0]?.payType ?? 1) as PayConfigType;
  };

  const [paymentMethod, setPaymentMethod] = useState<PayConfigType>(getDefaultPaymentMethod());
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [wechatQrExpired, setWechatQrExpired] = useState(false);
  const hasHandledPaidRef = useRef(false);
  const wechatQrExpireTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setPaymentMethod(getDefaultPaymentMethod());
  }, [open, payWayList]);

  useEffect(() => {
    if (!open) {
      setOrderId(null);
      setQrCode(null);
      setOrderNo(null);
      setQrLoading(false);
      setQrError(null);
      setWechatQrExpired(false);
      hasHandledPaidRef.current = false;
      if (wechatQrExpireTimerRef.current) {
        window.clearTimeout(wechatQrExpireTimerRef.current);
        wechatQrExpireTimerRef.current = null;
      }
    }
  }, [open]);

  const submitMutation = useSubmitRechargeMutation();
  const prepayMutation = usePayPrepayMutation();
  const { data: payResult } = useRechargePayResultQuery(orderId ?? "", {
    enabled: open && !!orderId && !!qrCode && !qrLoading && !qrError && !wechatQrExpired,
    refetchInterval: (query) => {
      if (wechatQrExpired) return false;
      const isPaid = query.state.data?.payStatus === 1 || query.state.data?.payState === 1;
      return isPaid ? false : 2000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setOrderId(null);
      setQrCode(null);
      setOrderNo(null);
      setQrLoading(false);
      setQrError(null);
      setWechatQrExpired(false);
      hasHandledPaidRef.current = false;
      if (wechatQrExpireTimerRef.current) {
        window.clearTimeout(wechatQrExpireTimerRef.current);
        wechatQrExpireTimerRef.current = null;
      }
    }
    onOpenChange(next);
  };

  const requestWechatQrCode = async (targetOrderId: string) => {
    setQrLoading(true);
    setQrError(null);
    setWechatQrExpired(false);
    const prepay = await prepayMutation.mutateAsync({
      orderId: targetOrderId,
      payType: paymentMethod,
      from: "recharge",
    });
    const rawQrCode = prepay.qrCode?.code_url;
    if (typeof rawQrCode === "string" && rawQrCode.length > 0) {
      setQrCode(rawQrCode);
      setQrLoading(false);
      return;
    }
    setQrCode(null);
    setQrLoading(false);
    setQrError("暂未获取到支付二维码，请稍后重试或更换支付方式");
  };

  const handleConfirmPay = async () => {
    if (!rule) return;
    if (!paymentMethod) {
      toast.error("支付功能未开启,请联系客服");
      return;
    }
    try {
      hasHandledPaidRef.current = false;
      const isAlipayPayment = paymentMethod === PayConfigPayType.ALIPAY;
      const paymentWindow = isAlipayPayment ? openAlipayPopup() : null;
      setOrderId(null);
      setQrCode(null);
      setOrderNo(null);
      setQrError(null);
      setWechatQrExpired(false);
      const order = await submitMutation.mutateAsync({
        id: rule.id,
        payType: paymentMethod,
      });
      setOrderId(order.orderId);
      setOrderNo(order.orderNo);
      setQrLoading(true);
      const prepay = await prepayMutation.mutateAsync({
        orderId: order.orderId,
        payType: paymentMethod,
        from: "recharge",
        returnUrl: isAlipayPayment ? buildAlipayReturnUrl(order.orderId, order.orderNo) : undefined,
      });
      if (isAlipayPayment) {
        const payForm = prepay.payForm;
        if (typeof payForm === "string" && payForm.length > 0) {
          if (!paymentWindow) {
            throw new Error("无法打开支付宝支付窗口，请检查浏览器是否拦截了弹窗");
          }
          submitAlipayForm(payForm, paymentWindow);
          setQrLoading(false);
          return;
        }
        paymentWindow?.close();
        setQrCode(null);
        setQrLoading(false);
        setQrError("暂未获取到支付宝支付链接，请稍后重试或更换支付方式");
        return;
      }
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
      try {
        if (paymentMethod === PayConfigPayType.ALIPAY) {
          window.focus();
        }
      } catch {
        // noop
      }
      setQrLoading(false);
      setQrError("创建订单或拉起支付失败，请稍后重试");
    }
  };

  const handleRefreshWechatQrCode = async () => {
    if (!orderId) return;
    try {
      await requestWechatQrCode(orderId);
    } catch (error) {
      console.error(error);
      setQrLoading(false);
      setQrError("刷新支付二维码失败，请稍后重试");
    }
  };

  useEffect(() => {
    const isPaid = payResult?.payStatus === 1 || payResult?.payState === 1;
    if (!isPaid || hasHandledPaidRef.current) return;
    hasHandledPaidRef.current = true;
    void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
    void queryClient.invalidateQueries({ queryKey: ["user", "account-log"] });
    toast.success("支付成功");
    handleOpenChange(false);
  }, [payResult, queryClient]);

  useEffect(() => {
    const handlePaymentSuccess = (event: Event) => {
      const customEvent = event as CustomEvent<{ payFrom?: string }>;
      if (customEvent.detail?.payFrom !== "recharge") return;
      handleOpenChange(false);
    };

    window.addEventListener("buildingai:alipay-payment-success", handlePaymentSuccess);
    return () => {
      window.removeEventListener("buildingai:alipay-payment-success", handlePaymentSuccess);
    };
  }, [handleOpenChange]);

  useEffect(() => {
    if (paymentMethod !== PayConfigPayType.WECHAT || !open || !qrCode || qrLoading || qrError) {
      if (wechatQrExpireTimerRef.current) {
        window.clearTimeout(wechatQrExpireTimerRef.current);
        wechatQrExpireTimerRef.current = null;
      }
      return;
    }

    setWechatQrExpired(false);
    wechatQrExpireTimerRef.current = window.setTimeout(() => {
      setWechatQrExpired(true);
    }, WECHAT_QR_EXPIRE_MS);

    return () => {
      if (wechatQrExpireTimerRef.current) {
        window.clearTimeout(wechatQrExpireTimerRef.current);
        wechatQrExpireTimerRef.current = null;
      }
    };
  }, [open, paymentMethod, qrCode, qrLoading, qrError]);

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
              {rechargeExplain && (
                <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {rechargeExplain}
                </p>
              )}
              {/* <div className="flex items-center justify-between border-t pt-4">
                <span className="text-muted-foreground text-sm">订单总额</span>
                <span className="text-xl font-semibold">{formatPrice(rule.sellPrice)}</span>
              </div> */}
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
                    {paymentMethod === PayConfigPayType.ALIPAY
                      ? "正在跳转支付宝…"
                      : "正在生成支付二维码…"}
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
                    <div className="relative flex size-48 items-center justify-center overflow-hidden rounded-lg border p-1">
                      <img
                        src={qrCode}
                        alt="支付二维码"
                        className="pointer-events-none size-full object-contain select-none"
                        onError={() => setQrError("二维码加载失败，请刷新页面或稍后重试")}
                      />
                      {wechatQrExpired && paymentMethod === PayConfigPayType.WECHAT && (
                        <div className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                          <AlertCircle className="text-destructive mb-2 size-12" />
                          <p className="text-muted-foreground mb-3 text-center text-sm">
                            二维码已过期，请刷新
                          </p>
                          <Button size="sm" variant="secondary" onClick={handleRefreshWechatQrCode}>
                            刷新二维码
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted flex size-48 items-center justify-center rounded-lg p-2 text-center text-xs break-all">
                      {qrCode}
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm">请使用微信扫码完成支付</p>
                </div>
              )}
              {!qrLoading && !qrError && !qrCode && paymentMethod === PayConfigPayType.ALIPAY && (
                <div className="bg-muted text-muted-foreground flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                  <span>支付宝支付窗口已打开</span>
                  <span>请在新窗口完成支付，支付成功后系统会自动刷新并提示你</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
