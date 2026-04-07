import { useI18n } from "@buildingai/i18n";
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
  const { t } = useI18n();
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
            title={t("dashboard.stats.user.title")}
            description={t("dashboard.stats.user.description")}
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
                      {t("dashboard.stats.user.changeVsYesterday")}
                      {(data?.user.userChange ?? 0) >= 0
                        ? t("dashboard.stats.user.increase")
                        : t("dashboard.stats.user.decrease")}
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
                  <span className="text-sm">{t("dashboard.stats.user.totalUsers")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.user.totalUsers ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.stats.user.activeUsers")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.user.activeUsers ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.stats.user.newUsersToday")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.user.newUsersToday ?? 0} />
                  </span>
                </div>
              </>
            )}
          </DataCard>

          <DataCard
            title={t("dashboard.stats.chat.title")}
            description={t("dashboard.stats.chat.description")}
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
                      {t("dashboard.stats.chat.changeVsYesterday")}
                      {(data?.chat.chatChange ?? 0) >= 0
                        ? t("dashboard.stats.chat.increase")
                        : t("dashboard.stats.chat.decrease")}
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
                  <span className="text-sm">{t("dashboard.stats.chat.totalConversations")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp
                      direction="up"
                      duration={0.05}
                      to={data?.chat.totalConversations ?? 0}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.stats.chat.totalTokens")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.chat.totalTokens ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.stats.chat.conversationsToday")}</span>
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

          <DataCard
            title={t("dashboard.stats.order.title")}
            description={t("dashboard.stats.order.description")}
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
                      {t("dashboard.stats.order.changeVsYesterday")}
                      {(data?.order.orderChange ?? 0) >= 0
                        ? t("dashboard.stats.order.increase")
                        : t("dashboard.stats.order.decrease")}
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
                  <span className="text-sm">{t("dashboard.stats.order.totalOrders")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.order.totalOrders ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.stats.order.totalAmount")}</span>
                  <span className="text-primary text-xl font-bold">
                    ¥<CountUp direction="up" duration={0.05} to={data?.order.totalAmount ?? 0} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.stats.order.ordersToday")}</span>
                  <span className="text-primary text-xl font-bold">
                    <CountUp direction="up" duration={0.05} to={data?.order.ordersToday ?? 0} />
                  </span>
                </div>
              </>
            )}
          </DataCard>
        </div>

        <div className="grid min-h-80 grid-cols-1 gap-4 lg:grid-cols-3">
          <AreaChartCard
            title={t("dashboard.chart.userTrend.title")}
            description={t("dashboard.chart.userTrend.description", { days: userDays })}
            xAxisKey="date"
            data={(data?.userDetail.chartData ?? []) as any}
            series={[
              {
                dataKey: "visit",
                label: t("dashboard.chart.userTrend.visit"),
                color: "var(--chart-1)",
                stackId: "a",
              },
              {
                dataKey: "register",
                label: t("dashboard.chart.userTrend.register"),
                color: "var(--chart-2)",
                stackId: "a",
              },
            ]}
            className="lg:col-span-2"
            onTimeRangeChange={handleUserTimeRangeChange}
          />
          <DataCard
            title={t("dashboard.chart.tokenRanking.title")}
            description={t("dashboard.chart.tokenRanking.description", { days: tokenDays })}
            contentClassName="flex flex-col gap-1 px-0 md:gap-2"
            action={
              <Tabs
                value={tokenRankingType}
                onValueChange={(value) => setTokenRankingType(value as "model" | "provider")}
              >
                <TabsList>
                  <TabsTrigger value="model">{t("dashboard.chart.tokenRanking.model")}</TabsTrigger>
                  <TabsTrigger value="provider">
                    {t("dashboard.chart.tokenRanking.provider")}
                  </TabsTrigger>
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
                    <span className="text-muted-foreground min-w-6 text-xs">
                      {t("dashboard.chart.tokenRanking.rank")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {tokenRankingType === "model"
                        ? t("dashboard.chart.tokenRanking.modelInfo")
                        : t("dashboard.chart.tokenRanking.providerInfo")}
                    </span>
                    <div className="text-muted-foreground ml-auto text-xs">
                      {t("dashboard.chart.tokenRanking.consumption")}
                    </div>
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
                              {item.conversations}
                              {t("dashboard.chart.tokenRanking.conversations")}
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
                              {item.conversations}
                              {t("dashboard.chart.tokenRanking.conversations")}
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
            title={t("dashboard.chart.revenueTrend.title")}
            description={t("dashboard.chart.revenueTrend.description", { days: revenueDays })}
            xAxisKey="date"
            data={(data?.revenueDetail.chartData ?? []) as any}
            series={[
              {
                dataKey: "revenue",
                label: t("dashboard.chart.revenueTrend.revenue"),
                color: "var(--chart-3)",
                stackId: "a",
              },
              {
                dataKey: "orders",
                label: t("dashboard.chart.revenueTrend.orders"),
                color: "var(--chart-4)",
                stackId: "a",
              },
            ]}
            className="lg:col-span-2"
            onTimeRangeChange={handleRevenueTimeRangeChange}
          />
          <DataCard
            title={t("dashboard.chart.appRanking.title")}
            description={t("dashboard.chart.appRanking.description")}
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
                    <span className="text-muted-foreground min-w-6 text-xs">
                      {t("dashboard.chart.tokenRanking.rank")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t("dashboard.chart.appRanking.appInfo")}
                    </span>
                    <div className="text-muted-foreground ml-auto text-xs">
                      {t("dashboard.chart.appRanking.usageCount")}
                    </div>
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
                            {t("dashboard.chart.appRanking.appId")}: {item.extensionId}
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="font-bold">{item.usageCount}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("dashboard.chart.appRanking.times")}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                      {t("dashboard.chart.appRanking.noData")}
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
