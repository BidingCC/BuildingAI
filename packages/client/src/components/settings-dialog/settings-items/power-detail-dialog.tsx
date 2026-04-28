"use client";

import { type UserAccountLogItem, useUserAccountLogInfiniteQuery } from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Badge } from "@buildingai/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

type TabValue = "all" | "inc" | "dec";

export function PowerDetailDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<TabValue>("all");
  const action = tab === "all" ? undefined : tab === "inc" ? "1" : "0";

  const { items, extend, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useUserAccountLogInfiniteQuery({ action }, { enabled: open });

  const summary = useMemo(() => {
    const power = extend?.power ?? 0;
    const membershipGiftPower = extend?.membershipGiftPower ?? 0;
    const rechargePower = extend?.rechargePower ?? Math.max(0, power - membershipGiftPower);
    const dailyGift = 0; // 假数据：每日赠送（待实现）
    return { power, membershipGiftPower, rechargePower, dailyGift };
  }, [extend]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>积分明细</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-4 pt-3 pb-4">
          <div className="flex flex-col gap-4">
            {/* 汇总 */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-muted-foreground text-xs">当前剩余积分总额</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl leading-none font-bold tabular-nums sm:text-5xl">
                  {summary.power}
                </span>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg border px-4 py-3">
              {/* 小屏：纵向列表，+ 号带分隔线 */}
              <div className="space-y-1 sm:hidden">
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">订阅积分</span>
                  <span className="font-semibold tabular-nums">{summary.membershipGiftPower}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  <Separator className="flex-1" />
                  <span>+</span>
                  <Separator className="flex-1" />
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">充值积分</span>
                  <span className="font-semibold tabular-nums">{summary.rechargePower}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  <Separator className="flex-1" />
                  <span>+</span>
                  <Separator className="flex-1" />
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">每日赠送</span>
                  <span className="font-semibold tabular-nums">{summary.dailyGift}</span>
                </div>
              </div>

              {/* 大屏：横向三列，中间纯 + 号 */}
              <div className="hidden items-center justify-between text-sm sm:flex">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground text-xs">订阅积分</span>
                  <span className="font-semibold tabular-nums">{summary.membershipGiftPower}</span>
                </div>
                <span className="text-muted-foreground px-2 text-lg">+</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground text-xs">充值积分</span>
                  <span className="font-semibold tabular-nums">{summary.rechargePower}</span>
                </div>
                <span className="text-muted-foreground px-2 text-lg">+</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground text-xs">每日赠送</span>
                  <span className="font-semibold tabular-nums">{summary.dailyGift}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
              <TabsList className="bg-muted/50 w-full rounded-lg p-[3px]">
                <TabsTrigger value="all" className="flex-1 rounded-md">
                  全部
                </TabsTrigger>
                <TabsTrigger value="inc" className="flex-1 rounded-md">
                  收入
                </TabsTrigger>
                <TabsTrigger value="dec" className="flex-1 rounded-md">
                  支出
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-3 overflow-auto">
                {isLoading ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[40vh]">
                    <InfiniteScroll
                      loading={isFetchingNextPage}
                      hasMore={!!hasNextPage}
                      showEmptyText={items.length > 0}
                      onLoadMore={() => fetchNextPage()}
                      emptyText="没有更多记录了"
                    >
                      {items.length === 0 ? (
                        <div className="text-muted-foreground py-10 text-center text-sm">
                          暂无积分记录
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 py-1">
                          {items.map((log: UserAccountLogItem) => {
                            const isInc = Number(log.action) === 1;
                            const amount = Number(log.changeAmount) || 0;
                            return (
                              <div
                                key={log.id}
                                className="bg-card flex items-start justify-between gap-3 rounded-lg border p-3"
                              >
                                <div className="flex min-w-0 items-start gap-2">
                                  <div
                                    className={cn(
                                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                                      isInc
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "bg-rose-500/10 text-rose-600",
                                    )}
                                  >
                                    {isInc ? (
                                      <ArrowDownLeft className="size-4" />
                                    ) : (
                                      <ArrowUpRight className="size-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate text-sm font-medium">
                                        {log.accountTypeDesc ?? log.remark ?? "积分变动"}
                                      </span>
                                      {log.consumeSourceDesc && (
                                        <Badge variant="secondary" className="max-w-40 truncate">
                                          {log.consumeSourceDesc}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-muted-foreground mt-1 text-xs">
                                      <TimeText format="YYYY/MM/DD HH:mm" value={log.createdAt} />
                                    </div>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div
                                    className={cn(
                                      "text-sm font-semibold tabular-nums",
                                      isInc ? "text-emerald-600" : "text-rose-600",
                                    )}
                                  >
                                    {isInc ? "+" : "-"}
                                    {amount}
                                  </div>
                                  <div className="text-muted-foreground mt-1 text-xs tabular-nums">
                                    余额 {Number(log.leftAmount) || 0}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </InfiniteScroll>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
