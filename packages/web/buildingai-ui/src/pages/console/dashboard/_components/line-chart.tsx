"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@buildingai/ui/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { cn } from "@buildingai/ui/lib/utils";
import { Info } from "lucide-react";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

export type TimeRange = "7d" | "15d" | "30d";

export type ChartDataItem = Record<string, string | number>;

export interface AreaChartSeries {
  dataKey: string;
  label: string;
  color: string;
  stackId?: string;
}

export interface AreaChartCardProps {
  title: string;
  description?: string;
  data: ChartDataItem[];
  series: AreaChartSeries[];
  xAxisKey?: string;
  defaultTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
  loading?: boolean;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "最近 7 天" },
  { value: "15d", label: "最近 15 天" },
  { value: "30d", label: "最近 30 天" },
];

export function AreaChartCard({
  title,
  description,
  data,
  series,
  xAxisKey = "date",
  defaultTimeRange = "7d",
  onTimeRangeChange,
  className,
  loading = false,
}: AreaChartCardProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>(defaultTimeRange);
  const chartId = React.useId();

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    series.forEach((s) => {
      config[s.dataKey] = {
        label: s.label,
        color: s.color,
      };
    });
    return config;
  }, [series]);

  const gradientIds = React.useMemo(() => {
    return series.map((s) => `fill-${s.dataKey}-${chartId}`);
  }, [series, chartId]);

  const handleTimeRangeChange = (value: string) => {
    const range = value as TimeRange;
    setTimeRange(range);
    onTimeRangeChange?.(range);
  };

  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardHeader className="flex items-center gap-2 space-y-0 px-4 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          {description && (
            <CardDescription className="flex items-center gap-1 text-xs">
              <Info className="size-3" />
              <span className="leading-none">{description}</span>
            </CardDescription>
          )}
        </div>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="flex sm:ml-auto" aria-label="选择时间范围">
            <SelectValue placeholder="选择时间范围" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-4">
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <span className="text-muted-foreground text-sm">加载中...</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <AreaChart data={data}>
              <defs>
                {series.map((s, index) => (
                  <linearGradient
                    key={s.dataKey}
                    id={gradientIds[index]}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("zh-CN", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              {series.map((s, index) => (
                <Area
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  type="natural"
                  fill={`url(#${gradientIds[index]})`}
                  stroke={s.color}
                  stackId={s.stackId}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
