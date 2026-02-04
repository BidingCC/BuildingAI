"use client";

import {
  useMembershipOrderListsInfiniteQuery,
  type UserMembershipOrderItem,
  type UserSubscriptionItem,
  useUserSubscriptionsQuery,
} from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
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
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { ChevronRight, Crown, Gift, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { SettingItem, SettingItemGroup } from "../setting-item";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

const SubscribeSetting = () => {
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscriptionItem | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useUserSubscriptionsQuery({ page: 1, pageSize: 10 });
  const levelId = selectedSubscription?.level?.id;
  const {
    items: orderItems,
    isLoading: isOrderLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMembershipOrderListsInfiniteQuery(
    { levelId: levelId ?? undefined },
    { enabled: open && !!levelId },
  );

  const handleItemClick = (subscription: UserSubscriptionItem) => {
    setSelectedSubscription(subscription);
    setOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <SettingItemGroup>
          {Array.from({ length: 2 }).map((_, index) => (
            <SettingItem
              key={index}
              title={
                <div className="flex items-center gap-1">
                  <Crown className="size-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              }
              description={<Skeleton className="mt-0.5 h-3 w-32" />}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-muted-foreground/10"
                disabled
              >
                <ChevronRight />
              </Button>
            </SettingItem>
          ))}
        </SettingItemGroup>
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <div>
        <SettingItemGroup>
          <SettingItem
            title={
              <div className="flex items-center gap-1">
                <Crown className="size-4" />
                暂无会员
              </div>
            }
            description="您当前没有有效的会员订阅"
          />
        </SettingItemGroup>
      </div>
    );
  }

  return (
    <div>
      <SettingItemGroup>
        {data.items.map((subscription) => {
          const levelName = subscription.level?.name ?? "未知等级";
          const levelIcon = subscription.level?.icon;
          const endTime = subscription.endTime ? formatDate(subscription.endTime) : null;
          const isExpired = subscription.isExpired;

          return (
            <SettingItem
              key={subscription.id}
              title={
                <div className="flex items-center gap-2">
                  {levelIcon ? (
                    <Avatar className="size-4">
                      <AvatarImage src={levelIcon} alt={levelName} />
                      <AvatarFallback className="size-4">
                        <Crown className="size-3" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Crown className="size-4" />
                  )}
                  {levelName}
                </div>
              }
              description={
                endTime ? `到期时间至 ${endTime}${isExpired ? " (已过期)" : ""}` : "永久有效"
              }
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-muted-foreground/10"
                onClick={() => handleItemClick(subscription)}
              >
                <ChevronRight />
              </Button>
            </SettingItem>
          );
        })}
      </SettingItemGroup>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>订阅详情</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="min-h-0 flex-1 px-5 pb-6">
              <div className="flex flex-col gap-6">
                {/* 订阅基本信息 */}
                <div className="flex flex-col gap-3 px-1">
                  <h3 className="text-sm font-medium">订阅信息</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span className="text-muted-foreground text-xs">等级名称</span>
                      <span className="text-sm">
                        {selectedSubscription.level?.name ?? "未知等级"}
                      </span>
                    </div>
                    {selectedSubscription.startTime && (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <span className="text-muted-foreground text-xs">开通时间</span>
                        <span className="text-sm">
                          <TimeText format="YYYY/MM/DD" value={selectedSubscription.startTime} />
                        </span>
                      </div>
                    )}
                    {selectedSubscription.endTime && (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <span className="text-muted-foreground text-xs">到期时间</span>
                        <span className="text-sm">
                          <TimeText format="YYYY/MM/DD" value={selectedSubscription.endTime} />
                        </span>
                      </div>
                    )}
                    {selectedSubscription.duration && (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <span className="text-muted-foreground text-xs">订阅时长</span>
                        <span className="text-sm">{selectedSubscription.duration}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 订单记录 */}
                <div className="flex flex-col gap-3">
                  <h3 className="px-1 text-sm font-medium">订单记录</h3>
                  {isOrderLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (
                    <ScrollArea className="flex max-h-[40vh] flex-col gap-3">
                      <InfiniteScroll
                        loading={isFetchingNextPage}
                        hasMore={!!hasNextPage}
                        onLoadMore={() => fetchNextPage()}
                        emptyText="没有更多订单了"
                      >
                        <div className="flex flex-col gap-3 p-1">
                          {orderItems.map((order: UserMembershipOrderItem) => {
                            const isGift = order.source === 0; // 系统赠送
                            const isRefunded = order.refundStatus === 1;

                            return (
                              <Card key={order.id} className="border-border bg-card border">
                                <CardContent className="p-4">
                                  <div className="flex flex-col gap-3">
                                    {/* 订单头部 */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {isGift ? (
                                          <Gift className="text-muted-foreground size-6" />
                                        ) : (
                                          <ShoppingCart className="text-muted-foreground size-6" />
                                        )}
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                              {order.source === 0 ? "系统赠送" : order.planName}
                                            </span>
                                            <Badge
                                              variant={isGift ? "default" : "secondary"}
                                              className="text-xs"
                                            >
                                              {order.sourceDesc}
                                            </Badge>
                                            {isRefunded && (
                                              <Badge variant="destructive" className="text-xs">
                                                已退款
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-muted-foreground text-xs">
                                            订单号：{order.orderNo}
                                          </span>
                                        </div>
                                      </div>
                                      {!isGift && (
                                        <span className="text-sm font-semibold">
                                          ¥{Number(order.orderAmount).toFixed(2)}
                                        </span>
                                      )}
                                    </div>

                                    {/* 订单详情 */}
                                    <div className="flex flex-col gap-1.5 border-t pt-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">等级</span>
                                        <span>{order.levelName}</span>
                                      </div>
                                      {order.duration && (
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">订阅时长</span>
                                          <span>{order.duration}</span>
                                        </div>
                                      )}
                                      {!isGift && (
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">支付方式</span>
                                          <span>{order.payTypeDesc}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">开通时间</span>
                                        <span>
                                          <TimeText
                                            format="YYYY/MM/DD HH:mm"
                                            value={order.createdAt}
                                          />
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </InfiniteScroll>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { SubscribeSetting };
