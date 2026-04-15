import { useDashboardQuery } from "@buildingai/services/console";
import CountUp from "@buildingai/ui/components/effects/count-up";
import { Avatar, AvatarFallback } from "@buildingai/ui/components/ui/avatar";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

import { ProviderAvatar } from "@/components/provider-avatar";
import { PageContainer } from "@/layouts/console/_components/page-container";

import DataCard from "./_components/data-card";
import { AreaChartCard } from "./_components/line-chart";

const DashboardIndexPage = () => {
  const [userDays, setUserDays] = useState(15);
  const [revenueDays, setRevenueDays] = useState(15);
  const [tokenDays] = useState(15);
  const [tokenRankingType, setTokenRankingType] = useState<"model" | "provider">("model");

  const { data, isLoading } = useDashboardQuery({
    userDays,
    revenueDays,
    tokenDays,
  });

  const handleUserTimeRangeChange = (range: "7d" | "15d" | "30d") => {
    const days = Number.parseInt(range.replace("d", ""), 10);
    setUserDays(days);
  };

  const handleRevenueTimeRangeChange = (range: "7d" | "15d" | "30d") => {
    const days = Number.parseInt(range.replace("d", ""), 10);
    setRevenueDays(days);
  };
  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DataCard
            title="订单统计"
            description="订单数据概览"
            contentClassName="flex flex-col gap-1 px-4 md:gap-2"
            action={
              <div className="flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-16 w-20" />
                ) : (
                  <>
                    {(data?.order.orderChange ?? 0) >= 0 ? (
                      <TrendingUp className="size-8 text-green-600" />
                    ) : (
                      <TrendingDown className="text-destructive size-8" />
                    )}
                    <div className="text-muted-foreground text-xs">
                      同比昨天
                      {(data?.order.orderChange ?? 0) >= 0 ? "增长" : "下降"}
                      <span
                        className={`mx-1 text-lg font-bold ${(data?.order.orderChange ?? 0) >= 0 ? "text-green-600" : "text-destructive"}`}
                      >
                        {Math.abs(data?.order.orderChange ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            }
          >
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">本月收入</span>
                  <span className="text-primary text-xl font-bold">
                    ¥
                    <CountUp
                      direction="up"
                      duration={0.05}
                      to={data?.order.monthOrderAmount ?? 0}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">订单金额</span>
                  <span className="text-primary text-xl font-bold">
                    ¥
                    <CountUp
                      direction="up"
                      duration={0.05}
                      to={data?.order.todayOrderAmount ?? 0}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">今日订单</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.order.ordersToday ?? 0} />
                  </span>
                </div>
              </>
            )}
          </DataCard>
          <DataCard
            title="用户统计"
            description="用户数据概览"
            contentClassName="flex flex-col gap-1 px-4 md:gap-2"
            action={
              <div className="flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-16 w-20" />
                ) : (
                  <>
                    {(data?.user.userChange ?? 0) >= 0 ? (
                      <TrendingUp className="size-8 text-green-600" />
                    ) : (
                      <TrendingDown className="text-destructive size-8" />
                    )}
                    <div className="text-muted-foreground text-xs">
                      同比昨天
                      {(data?.user.userChange ?? 0) >= 0 ? "增长" : "下降"}
                      <span
                        className={`mx-1 text-lg font-bold ${(data?.user.userChange ?? 0) >= 0 ? "text-green-600" : "text-destructive"}`}
                      >
                        {Math.abs(data?.user.userChange ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            }
          >
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">用户总数</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.user.totalUsers ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">活跃用户</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.user.activeUsers ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">今日新增</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.user.newUsersToday ?? 0} />
                  </span>
                </div>
              </>
            )}
          </DataCard>

          <DataCard
            title="对话统计"
            description="对话数据概览"
            contentClassName="flex flex-col gap-1 px-4 md:gap-2"
            action={
              <div className="flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-16 w-20" />
                ) : (
                  <>
                    {(data?.chat.chatChange ?? 0) >= 0 ? (
                      <TrendingUp className="size-8 text-blue-600" />
                    ) : (
                      <TrendingDown className="text-destructive size-8" />
                    )}
                    <div className="text-muted-foreground text-xs">
                      同比昨天
                      {(data?.chat.chatChange ?? 0) >= 0 ? "增长" : "下降"}
                      <span
                        className={`mx-1 text-lg font-bold ${(data?.chat.chatChange ?? 0) >= 0 ? "text-blue-600" : "text-destructive"}`}
                      >
                        {Math.abs(data?.chat.chatChange ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            }
          >
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">对话总数</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp
                      direction="up"
                      duration={0.05}
                      to={data?.chat.totalConversations ?? 0}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Token总数</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.chat.totalTokens ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">今日对话</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp
                      direction="up"
                      duration={0.05}
                      to={data?.chat.conversationsToday ?? 0}
                    />
                  </span>
                </div>
              </>
            )}
          </DataCard>
        </div>

        <div className="grid min-h-80 grid-cols-1 gap-4 lg:grid-cols-3">
          <AreaChartCard
            title="用户趋势"
            description={`近${userDays}天用户访问与注册趋势`}
            xAxisKey="date"
            data={(data?.userDetail.chartData ?? []) as any}
            series={[
              { dataKey: "visit", label: "访问数", color: "var(--chart-1)", stackId: "a" },
              { dataKey: "register", label: "注册数", color: "var(--chart-2)", stackId: "a" },
            ]}
            className="lg:col-span-2"
            onTimeRangeChange={handleUserTimeRangeChange}
          />
          <DataCard
            title="Token使用排行"
            description={`近${tokenDays}天Token消耗排行`}
            contentClassName="flex flex-col gap-1 px-0 md:gap-2"
            action={
              <Tabs
                value={tokenRankingType}
                onValueChange={(value) => setTokenRankingType(value as "model" | "provider")}
              >
                <TabsList>
                  <TabsTrigger value="model">模型</TabsTrigger>
                  <TabsTrigger value="provider">供应商</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            <ScrollArea className="h-[300px] px-4">
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-card sticky top-0 z-1 flex items-center gap-2">
                    <span className="text-muted-foreground min-w-6 text-xs">排名</span>
                    <span className="text-muted-foreground text-xs">
                      {tokenRankingType === "model" ? "模型信息" : "供应商信息"}
                    </span>
                    <div className="text-muted-foreground ml-auto text-xs">消耗</div>
                  </div>

                  {tokenRankingType === "model"
                    ? data?.tokenUsage.byModel.map((item, index) => (
                        <div className="flex items-center gap-2" key={item.modelId}>
                          <span className="text-muted-foreground min-w-6">#{index + 1}</span>
                          <ProviderAvatar
                            provider={item.provider}
                            iconUrl={item.iconUrl}
                            name={item.modelName}
                            size="sm"
                          />
                          <div>
                            <div>{item.modelName}</div>
                            <div className="text-muted-foreground text-xs">{item.providerName}</div>
                          </div>
                          <div className="ml-auto text-right">
                            <div>{(item.tokens / 1000).toFixed(1)}k</div>
                            <div className="text-muted-foreground text-xs">
                              {item.conversations}次
                            </div>
                          </div>
                        </div>
                      ))
                    : data?.tokenUsage.byProvider.map((item, index) => (
                        <div className="flex items-center gap-2" key={item.providerId}>
                          <span className="text-muted-foreground min-w-6">#{index + 1}</span>
                          <ProviderAvatar
                            provider={item.provider}
                            iconUrl={item.iconUrl}
                            name={item.providerName}
                            size="sm"
                          />
                          <div>
                            <div>{item.providerName}</div>
                            <div className="text-muted-foreground text-xs">{item.provider}</div>
                          </div>
                          <div className="ml-auto text-right">
                            <div>{(item.tokens / 1000).toFixed(1)}k</div>
                            <div className="text-muted-foreground text-xs">
                              {item.conversations}次
                            </div>
                          </div>
                        </div>
                      ))}
                </div>
              )}
            </ScrollArea>
          </DataCard>
        </div>

        <div className="grid min-h-80 grid-cols-1 gap-4 lg:grid-cols-3">
          <AreaChartCard
            title="收入趋势"
            description={`近${revenueDays}天收入与订单趋势`}
            xAxisKey="date"
            data={(data?.revenueDetail.chartData ?? []) as any}
            series={[
              { dataKey: "revenue", label: "收入", color: "var(--chart-3)", stackId: "a" },
              { dataKey: "orders", label: "订单数", color: "var(--chart-4)", stackId: "a" },
            ]}
            className="lg:col-span-2"
            onTimeRangeChange={handleRevenueTimeRangeChange}
          />
          <DataCard
            title="应用使用排行"
            description="应用使用次数统计"
            contentClassName="flex flex-col gap-1 px-0 md:gap-2"
          >
            <ScrollArea className="h-[300px] px-4">
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-card sticky top-0 z-1 flex items-center gap-2">
                    <span className="text-muted-foreground min-w-6 text-xs">排名</span>
                    <span className="text-muted-foreground text-xs">应用信息</span>
                    <div className="text-muted-foreground ml-auto text-xs">使用次数</div>
                  </div>

                  {data?.extension.usageRanking && data.extension.usageRanking.length > 0 ? (
                    data.extension.usageRanking.map((item, index) => (
                      <div className="flex items-center gap-2" key={item.extensionId}>
                        <span className="text-muted-foreground min-w-6">#{index + 1}</span>
                        <Avatar className="rounded-lg">
                          <AvatarFallback>{item.extensionName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div>{item.extensionName}</div>
                          <div className="text-muted-foreground text-xs">
                            应用ID: {item.extensionId}
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="font-bold">{item.usageCount}</div>
                          <div className="text-muted-foreground text-xs">次</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                      暂无应用使用数据
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </DataCard>
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardIndexPage;
