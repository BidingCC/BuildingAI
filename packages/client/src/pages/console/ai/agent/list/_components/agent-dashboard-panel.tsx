import { useConsoleAgentDashboardQuery } from "@buildingai/services/console";
import { useAgentDashboardQuery } from "@buildingai/services/web";
import type {
  AgentDashboardResult,
  DailyFeedbackItem,
  DashboardChartItem,
} from "@buildingai/types";
import { Button } from "@buildingai/ui/components/ui/button";
import { Calendar, type DateRange } from "@buildingai/ui/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@buildingai/ui/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { BookMarked, CalendarIcon, MessageSquare, RotateCcw, Zap } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useI18n } from "@buildingai/i18n";

type AgentDashboardPanelProps = {
  agentId: string;
  source?: "web" | "console";
  showTitle?: boolean;
  title?: string;
};

type CardStatMode = "total" | "daily";

type DashboardCards = AgentDashboardResult["cards"];
type DashboardCharts = AgentDashboardResult["charts"];

const DEFAULT_DAYS = 7;
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
] as const;
const FEEDBACK_LIKE_COLOR = "hsl(142 71% 42%)";
const FEEDBACK_DISLIKE_COLOR = "hsl(0 72% 51%)";

function getDefaultDateRange(): DateRange {
  const to = new Date();
  const from = subDays(to, DEFAULT_DAYS - 1);
  return { from, to };
}

function formatChartDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "MM/dd");
  } catch {
    return dateStr;
  }
}

function formatTooltipDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "yyyy年MM月dd日", { locale: zhCN });
  } catch {
    return dateStr;
  }
}

function buildQueryParams(range: DateRange | undefined) {
  if (!range?.from && !range?.to) return undefined;
  return {
    startTime: range.from ? range.from.toISOString() : undefined,
    endTime: range.to
      ? new Date(
          range.to.getFullYear(),
          range.to.getMonth(),
          range.to.getDate(),
          23,
          59,
          59,
          999,
        ).toISOString()
      : undefined,
  };
}

function StatCard({
  title,
  icon,
  stats,
  loading,
}: {
  title: string;
  icon: ReactNode;
  stats: { label: string; value: ReactNode }[];
  loading?: boolean;
}) {
  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground/60">{icon}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              {loading ? (
                <Skeleton className="mb-1 h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              )}
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DailyChart({
  title,
  data,
  dataKey,
  color,
  loading,
  valueFormatter,
}: {
  title: string;
  data: DashboardChartItem[];
  dataKey: string;
  color: string;
  loading?: boolean;
  valueFormatter?: (v: number) => string;
}) {
  const chartData = useMemo(
    () => data.map((d) => ({ date: d.date, [dataKey]: d.value })),
    [data, dataKey],
  );

  const config: ChartConfig = {
    [dataKey]: { label: title, color },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : (
          <ChartContainer config={config} className="h-48 w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={28}
                tick={{ fontSize: 11 }}
                tickFormatter={formatChartDate}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => (valueFormatter ? valueFormatter(v) : String(v))}
                width={44}
              />
              <ChartTooltip
                cursor={{ stroke: color, strokeOpacity: 0.2 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={formatTooltipDate}
                    formatter={(v) => [
                      <span key="v" className="font-medium tabular-nums">
                        {valueFormatter ? valueFormatter(v as number) : v}
                      </span>,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey={dataKey}
                type="monotone"
                fill={`url(#fill-${dataKey})`}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackChart({ data, loading }: { data: DailyFeedbackItem[]; loading?: boolean }) {
  const { t } = useI18n();
  const chartId = useId();
  const chartData = useMemo(
    () => data.map((d) => ({ date: d.date, like: d.like, dislike: d.dislike })),
    [data],
  );
  const config: ChartConfig = {
    like: { label: t("ai.agent.dashboard.like"), color: FEEDBACK_LIKE_COLOR },
    dislike: { label: t("ai.agent.dashboard.dislike"), color: FEEDBACK_DISLIKE_COLOR },
  };
  const gradientIds = ["like", "dislike"].map((k) => `fill-fb-${k}-${chartId}`);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t("ai.agent.dashboard.feedbackTrend")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : (
          <ChartContainer config={config} className="h-48 w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientIds[0]} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={FEEDBACK_LIKE_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={FEEDBACK_LIKE_COLOR} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={gradientIds[1]} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={FEEDBACK_DISLIKE_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={FEEDBACK_DISLIKE_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={28}
                tick={{ fontSize: 11 }}
                tickFormatter={formatChartDate}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11 }}
                width={44}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={formatTooltipDate} indicator="dot" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="like"
                type="monotone"
                fill={`url(#${gradientIds[0]})`}
                stroke={FEEDBACK_LIKE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                dataKey="dislike"
                type="monotone"
                fill={`url(#${gradientIds[1]})`}
                stroke={FEEDBACK_DISLIKE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function buildCardStats(
  cards: DashboardCards | undefined,
  mode: CardStatMode,
  daysInRange: number,
  t: (key: string) => string,
) {
  if (!cards) return null;
  if (mode === "total") {
    return {
      records: {
        value: cards.totalRecords.toLocaleString(),
        label: t("ai.agent.dashboard.stats.records"),
      },
      messages: {
        value: cards.totalMessages.toLocaleString(),
        label: t("ai.agent.dashboard.stats.messages"),
      },
      power: {
        value: cards.totalPower.toLocaleString(),
        label: t("ai.agent.dashboard.stats.power"),
      },
      tokens: {
        value: cards.totalTokens.toLocaleString(),
        label: t("ai.agent.dashboard.stats.tokens"),
      },
      annotations: {
        value: cards.totalAnnotations.toLocaleString(),
        label: t("ai.agent.dashboard.stats.annotations"),
      },
      hitAnnotations: {
        value: cards.hitAnnotations.toLocaleString(),
        label: t("ai.agent.dashboard.stats.hitAnnotations"),
      },
    };
  }

  return {
    records: {
      value: Math.round(cards.totalRecords / daysInRange).toLocaleString(),
      label: t("ai.agent.dashboard.stats.dailyRecords"),
    },
    messages: {
      value: Math.round(cards.totalMessages / daysInRange).toLocaleString(),
      label: t("ai.agent.dashboard.stats.dailyMessages"),
    },
    power: {
      value: Math.round(cards.totalPower / daysInRange).toLocaleString(),
      label: t("ai.agent.dashboard.stats.dailyPower"),
    },
    tokens: {
      value: Math.round(cards.totalTokens / daysInRange).toLocaleString(),
      label: t("ai.agent.dashboard.stats.dailyTokens"),
    },
    annotations: {
      value: cards.totalAnnotations.toLocaleString(),
      label: t("ai.agent.dashboard.stats.annotations"),
    },
    hitAnnotations: {
      value: cards.hitAnnotations.toLocaleString(),
      label: t("ai.agent.dashboard.stats.hitAnnotations"),
    },
  };
}

export function AgentDashboardPanel({
  agentId,
  source = "web",
  showTitle = true,
  title,
}: AgentDashboardPanelProps) {
  const { t } = useI18n();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange);
  const [cardMode, setCardMode] = useState<CardStatMode>("total");

  const queryParams = useMemo(() => buildQueryParams(dateRange), [dateRange]);
  const webQuery = useAgentDashboardQuery(agentId, queryParams, {
    enabled: source === "web" && !!agentId,
  });
  const consoleQuery = useConsoleAgentDashboardQuery(agentId, queryParams, {
    enabled: source === "console" && !!agentId,
  });

  const data = (source === "console" ? consoleQuery.data : webQuery.data) as
    | AgentDashboardResult
    | undefined;
  const isLoading = source === "console" ? consoleQuery.isLoading : webQuery.isLoading;
  const cards = data?.cards;
  const charts = data?.charts as DashboardCharts | undefined;

  const daysInRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 1;
    return Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
  }, [dateRange]);

  const cardStats = useMemo(
    () => buildCardStats(cards, cardMode, daysInRange, t),
    [cards, cardMode, daysInRange, t],
  );

  const isDefaultRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false;
    const defaultRange = getDefaultDateRange();
    return (
      format(dateRange.from, "yyyy-MM-dd") === format(defaultRange.from!, "yyyy-MM-dd") &&
      format(dateRange.to, "yyyy-MM-dd") === format(defaultRange.to!, "yyyy-MM-dd")
    );
  }, [dateRange]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {showTitle ? (
            <h1 className="text-lg font-semibold">{title || t("ai.agent.dashboard.monitoring")}</h1>
          ) : null}
          <Tabs
            value={cardMode}
            onValueChange={(v) => setCardMode(v as CardStatMode)}
            className="w-fit"
          >
            <TabsList className="h-8">
              <TabsTrigger value="total" className="text-xs">
                {t("ai.agent.dashboard.cumulative")}
              </TabsTrigger>
              <TabsTrigger value="daily" className="text-xs">
                {t("ai.agent.dashboard.daily")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
                <CalendarIcon className="size-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "yyyy/MM/dd")} – {format(dateRange.to, "yyyy/MM/dd")}
                    </>
                  ) : (
                    format(dateRange.from, "yyyy/MM/dd")
                  )
                ) : (
                  <span>{t("ai.agent.dashboard.selectDateRange")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {!isDefaultRange ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2"
              onClick={() => setDateRange(getDefaultDateRange())}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-px pb-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <StatCard
                title={t("ai.agent.dashboard.stats.conversation")}
                icon={<MessageSquare className="size-4" />}
                loading={isLoading}
                stats={[
                  {
                    label: cardStats?.records.label ?? t("ai.agent.dashboard.stats.records"),
                    value: cardStats?.records.value ?? 0,
                  },
                  {
                    label: cardStats?.messages.label ?? t("ai.agent.dashboard.stats.messages"),
                    value: cardStats?.messages.value ?? 0,
                  },
                ]}
              />
              <StatCard
                title={t("ai.agent.dashboard.stats.tokenConsume")}
                icon={<Zap className="size-4" />}
                loading={isLoading}
                stats={[
                  {
                    label: cardStats?.power.label ?? t("ai.agent.dashboard.stats.power"),
                    value: cardStats?.power.value ?? 0,
                  },
                  {
                    label: cardStats?.tokens.label ?? t("ai.agent.dashboard.stats.tokens"),
                    value: cardStats?.tokens.value ?? 0,
                  },
                ]}
              />
              <StatCard
                title={t("ai.agent.dashboard.stats.annotation")}
                icon={<BookMarked className="size-4" />}
                loading={isLoading}
                stats={[
                  {
                    label:
                      cardStats?.annotations.label ?? t("ai.agent.dashboard.stats.annotations"),
                    value: cardStats?.annotations.value ?? 0,
                  },
                  {
                    label:
                      cardStats?.hitAnnotations.label ??
                      t("ai.agent.dashboard.stats.hitAnnotations"),
                    value: cardStats?.hitAnnotations.value ?? 0,
                  },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <DailyChart
              title={t("ai.agent.dashboard.dailyRecords")}
              data={charts?.dailyRecords ?? []}
              dataKey="records"
              color={CHART_COLORS[0]}
              loading={isLoading}
            />
            <DailyChart
              title={t("ai.agent.dashboard.dailyTokens")}
              data={charts?.dailyTokens ?? []}
              dataKey="tokens"
              color={CHART_COLORS[0]}
              loading={isLoading}
              valueFormatter={(v) => v.toLocaleString()}
            />
            <DailyChart
              title={t("ai.agent.dashboard.dailyMessages")}
              data={charts?.dailyMessages ?? []}
              dataKey="messages"
              color={CHART_COLORS[1]}
              loading={isLoading}
            />
            <DailyChart
              title={t("ai.agent.dashboard.dailyUsers")}
              data={charts?.dailyUsers ?? []}
              dataKey="users"
              color={CHART_COLORS[2]}
              loading={isLoading}
            />
            <DailyChart
              title={t("ai.agent.dashboard.powerConsume")}
              data={charts?.dailyPower ?? []}
              dataKey="power"
              color={CHART_COLORS[3]}
              loading={isLoading}
              valueFormatter={(v) => v.toLocaleString()}
            />
            <FeedbackChart data={charts?.dailyFeedback ?? []} loading={isLoading} />
            <DailyChart
              title={t("ai.agent.dashboard.annotationTrend")}
              data={charts?.dailyAnnotations ?? []}
              dataKey="annotations"
              color={CHART_COLORS[2]}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
