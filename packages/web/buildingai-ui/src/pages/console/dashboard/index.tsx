import CountUp from "@buildingai/ui/components/effects/count-up";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Info, TrendingDown, TrendingUp } from "lucide-react";

import DataCard from "./_components/data-card";
import { AreaChartCard } from "./_components/line-chart";

const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  { date: "2024-04-03", desktop: 167, mobile: 120 },
  { date: "2024-04-04", desktop: 242, mobile: 260 },
  { date: "2024-04-05", desktop: 373, mobile: 290 },
  { date: "2024-04-06", desktop: 301, mobile: 340 },
  { date: "2024-04-07", desktop: 245, mobile: 180 },
  { date: "2024-04-08", desktop: 409, mobile: 320 },
  { date: "2024-04-09", desktop: 59, mobile: 110 },
  { date: "2024-04-10", desktop: 261, mobile: 190 },
  { date: "2024-04-11", desktop: 327, mobile: 350 },
  { date: "2024-04-12", desktop: 292, mobile: 210 },
  { date: "2024-04-13", desktop: 342, mobile: 380 },
  { date: "2024-04-14", desktop: 137, mobile: 220 },
  { date: "2024-04-15", desktop: 120, mobile: 170 },
  { date: "2024-04-16", desktop: 138, mobile: 190 },
  { date: "2024-04-17", desktop: 446, mobile: 360 },
  { date: "2024-04-18", desktop: 364, mobile: 410 },
  { date: "2024-04-19", desktop: 243, mobile: 180 },
  { date: "2024-04-20", desktop: 89, mobile: 150 },
  { date: "2024-04-21", desktop: 137, mobile: 200 },
  { date: "2024-04-22", desktop: 224, mobile: 170 },
  { date: "2024-04-23", desktop: 138, mobile: 230 },
  { date: "2024-04-24", desktop: 387, mobile: 290 },
  { date: "2024-04-25", desktop: 215, mobile: 250 },
  { date: "2024-04-26", desktop: 75, mobile: 130 },
  { date: "2024-04-27", desktop: 383, mobile: 420 },
  { date: "2024-04-28", desktop: 122, mobile: 180 },
  { date: "2024-04-29", desktop: 315, mobile: 240 },
  { date: "2024-04-30", desktop: 454, mobile: 380 },
  { date: "2024-05-01", desktop: 165, mobile: 220 },
  { date: "2024-05-02", desktop: 293, mobile: 310 },
  { date: "2024-05-03", desktop: 247, mobile: 190 },
  { date: "2024-05-04", desktop: 385, mobile: 420 },
  { date: "2024-05-05", desktop: 481, mobile: 390 },
  { date: "2024-05-06", desktop: 498, mobile: 520 },
  { date: "2024-05-07", desktop: 388, mobile: 300 },
  { date: "2024-05-08", desktop: 149, mobile: 210 },
  { date: "2024-05-09", desktop: 227, mobile: 180 },
  { date: "2024-05-10", desktop: 293, mobile: 330 },
  { date: "2024-05-11", desktop: 335, mobile: 270 },
  { date: "2024-05-12", desktop: 197, mobile: 240 },
  { date: "2024-05-13", desktop: 197, mobile: 160 },
  { date: "2024-05-14", desktop: 448, mobile: 490 },
  { date: "2024-05-15", desktop: 473, mobile: 380 },
  { date: "2024-05-16", desktop: 338, mobile: 400 },
  { date: "2024-05-17", desktop: 499, mobile: 420 },
  { date: "2024-05-18", desktop: 315, mobile: 350 },
  { date: "2024-05-19", desktop: 235, mobile: 180 },
  { date: "2024-05-20", desktop: 177, mobile: 230 },
  { date: "2024-05-21", desktop: 82, mobile: 140 },
  { date: "2024-05-22", desktop: 81, mobile: 120 },
  { date: "2024-05-23", desktop: 252, mobile: 290 },
  { date: "2024-05-24", desktop: 294, mobile: 220 },
  { date: "2024-05-25", desktop: 201, mobile: 250 },
  { date: "2024-05-26", desktop: 213, mobile: 170 },
  { date: "2024-05-27", desktop: 420, mobile: 460 },
  { date: "2024-05-28", desktop: 233, mobile: 190 },
  { date: "2024-05-29", desktop: 78, mobile: 130 },
  { date: "2024-05-30", desktop: 340, mobile: 280 },
  { date: "2024-05-31", desktop: 178, mobile: 230 },
  { date: "2024-06-01", desktop: 178, mobile: 200 },
  { date: "2024-06-02", desktop: 470, mobile: 410 },
  { date: "2024-06-03", desktop: 103, mobile: 160 },
  { date: "2024-06-04", desktop: 439, mobile: 380 },
  { date: "2024-06-05", desktop: 88, mobile: 140 },
  { date: "2024-06-06", desktop: 294, mobile: 250 },
  { date: "2024-06-07", desktop: 323, mobile: 370 },
  { date: "2024-06-08", desktop: 385, mobile: 320 },
  { date: "2024-06-09", desktop: 438, mobile: 480 },
  { date: "2024-06-10", desktop: 155, mobile: 200 },
  { date: "2024-06-11", desktop: 92, mobile: 150 },
  { date: "2024-06-12", desktop: 492, mobile: 420 },
  { date: "2024-06-13", desktop: 81, mobile: 130 },
  { date: "2024-06-14", desktop: 426, mobile: 380 },
  { date: "2024-06-15", desktop: 307, mobile: 350 },
  { date: "2024-06-16", desktop: 371, mobile: 310 },
  { date: "2024-06-17", desktop: 475, mobile: 520 },
  { date: "2024-06-18", desktop: 107, mobile: 170 },
  { date: "2024-06-19", desktop: 341, mobile: 290 },
  { date: "2024-06-20", desktop: 408, mobile: 450 },
  { date: "2024-06-21", desktop: 169, mobile: 210 },
  { date: "2024-06-22", desktop: 317, mobile: 270 },
  { date: "2024-06-23", desktop: 480, mobile: 530 },
  { date: "2024-06-24", desktop: 132, mobile: 180 },
  { date: "2024-06-25", desktop: 141, mobile: 190 },
  { date: "2024-06-26", desktop: 434, mobile: 380 },
  { date: "2024-06-27", desktop: 448, mobile: 490 },
  { date: "2024-06-28", desktop: 149, mobile: 200 },
  { date: "2024-06-29", desktop: 103, mobile: 160 },
  { date: "2024-06-30", desktop: 446, mobile: 400 },
];

const DashboardPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DataCard
          title="对话统计"
          description="这是副标题"
          contentClassName="flex flex-col gap-1 px-4 md:gap-2"
          action={
            <div className="flex flex-col items-center justify-center">
              <TrendingUp className="size-8 text-green-600" />
              <div className="text-muted-foreground text-xs">
                同比昨天增长<span className="mx-1 text-lg font-bold text-green-600">1</span>人
              </div>
            </div>
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={1010} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={7362} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={2293} />
            </span>
          </div>
        </DataCard>

        <DataCard
          title="对话统计"
          description="这是副标题"
          contentClassName="flex flex-col gap-1 px-4 md:gap-2"
          action={
            <div className="flex flex-col items-center justify-center">
              <TrendingUp className="size-8 text-blue-600" />
              <div className="text-muted-foreground text-xs">
                同比昨天增长<span className="mx-1 text-lg font-bold text-blue-600">1</span>人
              </div>
            </div>
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={1010} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={7362} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={2293} />
            </span>
          </div>
        </DataCard>

        <DataCard
          title="对话统计"
          description="这是副标题"
          contentClassName="flex flex-col gap-1 px-4 md:gap-2"
          action={
            <div className="flex flex-col items-center justify-center">
              <TrendingDown className="text-destructive size-8" />
              <div className="text-muted-foreground text-xs">
                同比昨天下降<span className="text-destructive mx-1 text-lg font-bold">1</span>人
              </div>
            </div>
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={1010} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={7362} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">用户总数</span>
            <span className="text-primary text-xl font-bold">
              <CountUp direction="up" duration={0.05} to={2293} />
            </span>
          </div>
        </DataCard>
      </div>

      <div className="grid min-h-80 grid-cols-1 gap-4 lg:grid-cols-3">
        <AreaChartCard
          title="订单统计"
          description="每日订单趋势"
          xAxisKey="date"
          data={chartData}
          series={[
            { dataKey: "desktop", label: "桌面端", color: "var(--chart-1)", stackId: "a" },
            { dataKey: "mobile", label: "移动端", color: "var(--chart-2)", stackId: "a" },
          ]}
          className="lg:col-span-2"
          onTimeRangeChange={(range) => console.log("时间范围变化:", range)}
        />
        <DataCard
          title="排行订单"
          description="这是副标题"
          contentClassName="flex flex-col gap-1 px-4 md:gap-2"
          action={
            <Tabs defaultValue="account">
              <TabsList>
                <TabsTrigger value="account">模型</TabsTrigger>
                <TabsTrigger value="password">供应商</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <ScrollArea className="h-[300px]">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 10 }).map((_, index) => {
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-6">#{index + 1}</span>
                    <Avatar className="rounded-lg">
                      <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
                      <AvatarFallback>ER</AvatarFallback>
                    </Avatar>
                    <div>
                      <div>模型名称</div>
                      <div className="text-muted-foreground text-xs">模型名称</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DataCard>
      </div>

      <div className="grid min-h-80 grid-cols-1 gap-4 lg:grid-cols-3">
        <AreaChartCard
          title="订单统计"
          description="每日订单趋势"
          xAxisKey="date"
          data={chartData}
          series={[
            { dataKey: "desktop", label: "桌面端", color: "var(--chart-3)", stackId: "a" },
            { dataKey: "mobile", label: "移动端", color: "var(--chart-4)", stackId: "a" },
          ]}
          className="lg:col-span-2"
          onTimeRangeChange={(range) => console.log("时间范围变化:", range)}
        />
        <Card className="gap-0 py-4">
          <CardHeader className="px-4">
            <CardTitle className="">对话统计</CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs">
              <Info className="size-3" />
              <span className="leading-none">这是副标题</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-2 px-4">
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col gap-3">
                {Array.from({ length: 10 }).map((_, index) => {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground min-w-6">#{index + 1}</span>
                      <Avatar className="rounded-lg">
                        <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
                        <AvatarFallback>ER</AvatarFallback>
                      </Avatar>
                      <div>
                        <div>模型名称</div>
                        <div className="text-muted-foreground text-xs">模型名称</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
