import {
  type BillingItem,
  type MembershipPlan,
  type PayConfigType,
  type PayWayItem,
  useMembershipCenterQuery,
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
import { Check, CreditCard, Zap } from "lucide-react";
import { useEffect, useState } from "react";

function formatPrice(amount: number) {
  return `¥${Number(amount).toFixed(2)}`;
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

function parseBenefits(level: BillingItem["level"]): string[] {
  if (!level?.benefits) return [];
  const b = level.benefits as string | { content?: string }[];
  if (Array.isArray(b)) {
    return b.map((item) =>
      typeof item === "object" && item?.content ? item.content : String(item),
    );
  }
  if (typeof b === "string") {
    try {
      const parsed = JSON.parse(b) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) =>
          typeof item === "object" && item && "content" in item
            ? String((item as { content?: string }).content)
            : String(item),
        );
      }
      return b
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return b
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function PaymentDialog({
  planId,
  levelId,
  planName,
  levelName,
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
  planPrice: string;
  planPeriod: string;
  planBadge?: string;
  planGift: string;
  payWayList?: PayWayItem[];
}) {
  const firstPayType = payWayList[0]?.payType ?? 1;
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PayConfigType>(firstPayType as PayConfigType);
  const [qrCode, setQrCode] = useState<string | null>(null);
  useEffect(() => {
    if (payWayList.length > 0) {
      setPaymentMethod(payWayList[0].payType as PayConfigType);
    }
  }, [payWayList.length, payWayList[0]?.payType]);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const submitOrderMutation = useMembershipSubmitOrderMutation();
  const prepayMutation = usePayPrepayMutation();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQrCode(null);
      setOrderNo(null);
    }
    setOpen(next);
  };

  const handleConfirmPay = async () => {
    try {
      const order = await submitOrderMutation.mutateAsync({
        planId,
        levelId,
        payType: paymentMethod,
      });
      setOrderNo(order.orderNo);
      const prepay = await prepayMutation.mutateAsync({
        orderId: order.orderId,
        payType: paymentMethod,
        from: "membership",
      });
      setQrCode(prepay.qrCode || null);
    } catch (e) {
      console.error(e);
    }
  };

  const isLoading = submitOrderMutation.isPending || prepayMutation.isPending;
  const showQr = qrCode || orderNo;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full" size="sm" variant="default">
          开通{levelName}
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
                        <span className="font-medium text-green-600 tabular-nums dark:text-green-400">
                          + {planGift}
                        </span>
                      </div>
                    )}
                    <Separator className="border-border border-t border-dashed bg-transparent data-[orientation=horizontal]:h-0" />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">实付金额</span>
                      <span className="text-primary text-lg font-semibold tabular-nums">
                        {planPrice}
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
              {qrCode && (
                <div className="flex flex-col items-center gap-2">
                  {qrCode.startsWith("http") || qrCode.startsWith("data:") ? (
                    <img src={qrCode} alt="支付二维码" className="size-48 object-contain" />
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

function PlanCard({
  plan,
  billing,
  payWayList = [],
}: {
  plan: MembershipPlan;
  billing: BillingItem;
  payWayList?: PayWayItem[];
}) {
  const level = billing.level;
  const price = billing.salesPrice ?? billing.originalPrice ?? 0;
  const givePower = level?.givePower ?? 0;
  const description = billing?.level?.description ?? "";
  const benefitsList = parseBenefits(level);
  const planPeriod = getPlanPeriodLabel(plan);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5 px-6 py-2">
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
              {benefitsList.slice(0, 12).map((line: string, i: number) => (
                <div key={i} className="text-muted-foreground flex items-center gap-2">
                  <Check className="size-4 shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function UpgradeDialog() {
  const { data: center, isLoading, isError } = useMembershipCenterQuery();
  const plans = center?.plans ?? [];
  const defaultPlanId = plans[0]?.id;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={(event: React.MouseEvent<HTMLSpanElement>) => {
            event.stopPropagation();
          }}
        >
          升级
        </span>
      </DialogTrigger>
      <DialogContent
        className="m-0 flex h-screen max-h-screen w-screen max-w-full! flex-col rounded-none p-0"
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>升级会员</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col items-center overflow-auto p-6">
          <div className="flex items-center justify-center pt-12 pb-6 text-lg font-medium">
            <h2 className="text-3xl font-normal">升级套餐</h2>
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
                        className="pt-6 sm:w-[60vw] md:w-xl lg:w-4xl xl:w-5xl"
                      >
                        <div className="group/membership">
                          {billings.length === 0 ? (
                            <div className="text-muted-foreground py-8 text-center text-sm">
                              该套餐暂无档位
                            </div>
                          ) : (
                            <Carousel
                              opts={{ align: "start" }}
                              className="w-[60vw] md:w-full lg:w-full"
                            >
                              <CarouselContent>
                                {billings.map((billing) => (
                                  <CarouselItem
                                    key={`${plan.id}-${billing.levelId}`}
                                    className="md:basis-1/2 lg:basis-1/2 xl:basis-1/3"
                                  >
                                    <div className="h-full p-1">
                                      <PlanCard
                                        plan={plan}
                                        billing={billing}
                                        payWayList={center?.payWayList ?? []}
                                      />
                                    </div>
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                              <CarouselPrevious className="opacity-0! group-hover/membership:opacity-100!" />
                              <CarouselNext className="opacity-0! group-hover/membership:opacity-100!" />
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
