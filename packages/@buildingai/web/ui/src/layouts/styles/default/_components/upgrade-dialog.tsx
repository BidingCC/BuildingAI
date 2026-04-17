import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type BillingItem,
  type MembershipLevel,
  type MembershipPlan,
  type PayConfigType,
  type PayWayItem,
  type PrepayResponse,
  useMembershipCenterQuery,
  useMembershipPayResultQuery,
  useMembershipSubmitOrderMutation,
  usePayPrepayMutation,
} from "@buildingai/services/web";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@buildingai/ui/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@buildingai/ui/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CreditCard, Zap } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const WECHAT_QR_EXPIRE_MS = 60 * 1000;

function formatPrice(amount: number) {
  return `¥${Number(amount).toFixed(2)}`;
}

function buildAlipayReturnUrl(orderId: string, orderNo: string) {
  const url = new URL("/payment/alipay-return", window.location.origin);
  url.searchParams.set("payFrom", "membership");
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

function getPlanPeriodLabel(plan: MembershipPlan): string {
  if (plan.duration?.value && plan.duration?.unit) {
    const unitMap: Record<string, string> = {
      day: "天",
      天: "天",
      month: "月",
      月: "月",
      year: "年",
      年: "年",
    };
    const u = unitMap[plan.duration.unit] || plan.duration.unit;
    return `${plan.duration.value}${u}`;
  }
  const map: Record<number, string> = {
    1: "月",
    2: "季",
    3: "6个月",
    4: "年",
    5: "终身",
    6: "自定义",
  };
  return map[plan.durationConfig] ?? "";
}

type BenefitItem = {
  icon?: string;
  content: string;
};

function parseBenefits(level: BillingItem["level"]): BenefitItem[] {
  if (!level?.benefits) return [];
  const b = level.benefits as string | Array<string | { icon?: string; content?: string }>;
  if (Array.isArray(b)) {
    return b
      .map((item): BenefitItem | null => {
        if (typeof item === "object" && item?.content) {
          return {
            icon: item.icon,
            content: item.content,
          };
        }

        const content = String(item).trim();
        return content ? { icon: undefined, content } : null;
      })
      .filter((item): item is BenefitItem => item !== null);
  }
  if (typeof b === "string") {
    try {
      const parsed = JSON.parse(b) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item): BenefitItem | null => {
            if (typeof item === "object" && item && "content" in item) {
              const benefit = item as { icon?: string; content?: string };
              if (!benefit.content) return null;
              return {
                icon: benefit.icon,
                content: String(benefit.content),
              };
            }

            const content = String(item).trim();
            return content ? { icon: undefined, content } : null;
          })
          .filter((item): item is BenefitItem => item !== null);
      }
      return b
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((content): BenefitItem => ({ icon: undefined, content }));
    } catch {
      return b
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((content): BenefitItem => ({ icon: undefined, content }));
    }
  }
  return [];
}

function PaymentDialog({
  planId,
  levelId,
  planName,
  levelName,
  isCurrentLevel,
  planPrice,
  planPeriod,
  planBadge,
  planGift,
  payWayList = [],
}: {
  planId: string;
  levelId: string;
  planName: string;
  levelName: string;
  isCurrentLevel: boolean;
  planPrice: string;
  planPeriod: string;
  planBadge?: string;
  planGift: string;
  payWayList?: PayWayItem[];
}) {
  /** 从已开启的支付方式中取默认值：有默认则用默认，否则用第一个 */
  const getDefaultPaymentMethod = (): PayConfigType => {
    if (payWayList.length === 0) return undefined as unknown as PayConfigType;
    const defaultItem = payWayList.find((item) => item.isDefault === BooleanNumber.YES);
    return (defaultItem?.payType ?? payWayList[0]?.payType ?? 1) as PayConfigType;
  };
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayConfigType>(getDefaultPaymentMethod());
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [wechatQrExpired, setWechatQrExpired] = useState(false);
  const hasHandledPaidRef = useRef(false);
  const wechatQrExpireTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    setPaymentMethod(getDefaultPaymentMethod());
  }, [open, payWayList]);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const submitOrderMutation = useMembershipSubmitOrderMutation();
  const prepayMutation = usePayPrepayMutation();
  const { data: payResult } = useMembershipPayResultQuery(orderId ?? "", {
    enabled: open && !!orderId && !!qrCode && !qrLoading && !qrError && !wechatQrExpired,
    refetchInterval: (query) => {
      if (wechatQrExpired) return false;
      const isPaid = query.state.data?.payState === 1 || query.state.data?.payStatus === 1;
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
    setOpen(next);
  };

  const requestWechatQrCode = async (targetOrderId: string) => {
    setQrLoading(true);
    setQrError(null);
    setWechatQrExpired(false);
    const prepay = await prepayMutation.mutateAsync({
      orderId: targetOrderId,
      payType: paymentMethod,
      from: "membership",
    });
    const rawQrCode = (prepay as PrepayResponse)?.qrCode?.code_url;
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
      const order = await submitOrderMutation.mutateAsync({
        planId,
        levelId,
        payType: paymentMethod,
      });
      setOrderId(order.orderId);
      setOrderNo(order.orderNo);
      setQrLoading(true);
      const prepay = await prepayMutation.mutateAsync({
        orderId: order.orderId,
        payType: paymentMethod,
        from: "membership",
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
      const rawQrCode = (prepay as PrepayResponse)?.qrCode?.code_url;
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
    const isPaid = payResult?.payState === 1 || payResult?.payStatus === 1;
    if (!isPaid || hasHandledPaidRef.current) return;
    hasHandledPaidRef.current = true;
    void queryClient.invalidateQueries({ queryKey: ["membership", "center"] });
    void queryClient.invalidateQueries({ queryKey: ["membership", "subscriptions"] });
    void queryClient.invalidateQueries({ queryKey: ["membership", "order"] });
    void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
    void queryClient.invalidateQueries({ queryKey: ["user", "account-log"] });
    toast.success("支付成功");
    handleOpenChange(false);
  }, [payResult, queryClient]);

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

  const isLoading = submitOrderMutation.isPending || prepayMutation.isPending;
  const showQr = qrCode || orderNo;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          size="sm"
          variant={isCurrentLevel ? "outline" : "default"}
          disabled={isCurrentLevel}
        >
          {isCurrentLevel ? "您当前的会员等级" : `开通${levelName}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{showQr ? "请完成支付" : "确认订单"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          {!showQr ? (
            <>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">会员套餐</span>
                      <span className="font-medium">
                        {planName}
                        {planBadge && (
                          <Badge className="bg-primary/10 text-primary ml-1.5 text-xs">
                            {planBadge}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">会员等级</span>
                      <span className="font-medium">{levelName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">会员时长</span>
                      <span className="font-medium">
                        {planPeriod === "月"
                          ? "1个月"
                          : planPeriod === "季"
                            ? "3个月"
                            : planPeriod === "年"
                              ? "12个月"
                              : planPeriod}
                      </span>
                    </div>
                    {planGift && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">赠送积分</span>
                        <span className="text-lg font-semibold tabular-nums dark:text-green-400">
                          + {planGift}
                        </span>
                      </div>
                    )}
                    <Separator className="border-border border-t border-dashed bg-transparent data-[orientation=horizontal]:h-0" />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">实付金额</span>
                      <span className="text-lg font-semibold tabular-nums">{planPrice}</span>
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
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-muted-foreground text-sm">订单总额</span>
                <span className="text-xl font-semibold">{planPrice}</span>
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

function PlanCard({
  plan,
  billing,
  currentLevel,
  payWayList = [],
}: {
  plan: MembershipPlan;
  billing: BillingItem;
  currentLevel?: MembershipLevel | null;
  payWayList?: PayWayItem[];
}) {
  const level = billing.level;
  const price = billing.salesPrice ?? billing.originalPrice ?? 0;
  const givePower = level?.givePower ?? 0;
  const description = billing?.level?.description ?? "";
  const benefitsList = parseBenefits(level);
  const planPeriod = getPlanPeriodLabel(plan);
  const isCurrentLevel = Boolean(currentLevel?.id && level?.id && currentLevel.id === level.id);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5 px-4 py-2 md:px-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarImage src={level?.icon ?? ""} alt={level?.name ?? ""} />
                <AvatarFallback>{level?.name?.slice(0, 1) ?? "-"}</AvatarFallback>
              </Avatar>
              <h3 className="text-base font-semibold">{level?.name ?? "-"}</h3>
            </div>
            {(billing.label ?? plan.label) && (
              <Badge className="bg-primary/10 text-primary">{billing.label ?? plan.label}</Badge>
            )}
          </div>

          <div className="text-left">
            <div className="flex items-end gap-1.5 text-2xl leading-none font-semibold">
              <span>{formatPrice(price)}</span>
              <span className="text-muted-foreground text-xs font-normal">/{planPeriod}</span>
            </div>
          </div>
          <PaymentDialog
            planId={plan.id}
            levelId={billing.levelId}
            planName={plan.name}
            levelName={level?.name ?? ""}
            isCurrentLevel={isCurrentLevel}
            planPrice={formatPrice(price)}
            planPeriod={planPeriod}
            planBadge={billing.label ?? plan.label ?? undefined}
            planGift={String(givePower)}
            payWayList={payWayList}
          />
        </div>
        <div>
          {givePower > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="size-4" />
              <span>获得{givePower}积分</span>
            </div>
          )}
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        {benefitsList.length > 0 && (
          <>
            <Separator className="border-border border-t border-dashed bg-transparent data-[orientation=horizontal]:h-0" />
            <div className="flex flex-col gap-2">
              {benefitsList.map((benefit: BenefitItem, i: number) => (
                <div key={i} className="text-muted-foreground flex items-center gap-2">
                  {benefit.icon ? (
                    <Avatar className="size-4 rounded-lg">
                      <AvatarImage src={benefit.icon} alt="权益图标" className="rounded-none" />
                    </Avatar>
                  ) : (
                    <Check className="size-4 shrink-0" />
                  )}
                  <span>{benefit.content}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function UpgradeDialog({
  children,
  open,
  onOpenChange,
}: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { data: center, isLoading, isError } = useMembershipCenterQuery();
  const plans = center?.plans ?? [];
  const currentLevel = center?.userSubscription?.level ?? null;
  const defaultPlanId = plans[0]?.id;

  useEffect(() => {
    const handlePaymentSuccess = (event: Event) => {
      const customEvent = event as CustomEvent<{ payFrom?: string }>;
      if (customEvent.detail?.payFrom !== "membership") return;
      if (!open) return;
      onOpenChange?.(false);
    };

    window.addEventListener("buildingai:alipay-payment-success", handlePaymentSuccess);
    return () => {
      window.removeEventListener("buildingai:alipay-payment-success", handlePaymentSuccess);
    };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        className="m-0 flex h-screen max-h-screen w-screen max-w-full! flex-col rounded-none p-0"
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>订阅计划</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col items-center p-6">
          <div className="flex items-center justify-center pt-12 pb-6 text-lg font-medium">
            <h2 className="text-3xl font-normal">订阅计划</h2>
          </div>
          {isLoading && <div className="text-muted-foreground py-12 text-sm">加载中…</div>}
          {isError && <div className="text-destructive py-12 text-sm">加载失败，请稍后重试</div>}
          {!isLoading && !isError && (
            <div>
              {plans.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center text-sm">暂无可用套餐</div>
              ) : (
                <Tabs defaultValue={defaultPlanId} className="flex flex-col items-center">
                  <TabsList>
                    {plans.map((plan) => (
                      <TabsTrigger key={plan.id} value={plan.id} className="flex-none md:min-w-40">
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          {plan.label && (
                            <Badge className="bg-primary/10 text-primary">{plan.label}</Badge>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {plans.map((plan) => {
                    const billings = (plan.billing ?? []).filter(
                      (b) => b.status !== false && b.level,
                    );
                    return (
                      <TabsContent
                        key={plan.id}
                        value={plan.id}
                        className="flex w-full justify-center pt-6 lg:w-4xl xl:w-5xl"
                      >
                        <div className="group/membership flex flex-1 justify-center md:px-12">
                          {billings.length === 0 ? (
                            <div className="text-muted-foreground py-8 text-center text-sm">
                              该套餐暂无档位
                            </div>
                          ) : (
                            <Carousel
                              opts={{ align: "start" }}
                              className="max-w-[calc(100dvw-(8rem))] md:w-full lg:w-full"
                            >
                              <CarouselContent>
                                {billings.map((billing) => (
                                  <CarouselItem
                                    key={`${plan.id}-${billing.levelId}`}
                                    className="sm:basis-1/2 lg:basis-1/2 xl:basis-1/3"
                                  >
                                    <div className="h-full p-1">
                                      <PlanCard
                                        plan={plan}
                                        billing={billing}
                                        currentLevel={currentLevel}
                                        payWayList={center?.payWayList ?? []}
                                      />
                                    </div>
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                              <CarouselPrevious className="group-hover/membership:opacity-100! disabled:group-hover/membership:opacity-50! md:opacity-0!" />
                              <CarouselNext className="group-hover/membership:opacity-100! disabled:group-hover/membership:opacity-50! md:opacity-0!" />
                            </Carousel>
                          )}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
