import { Card, CardContent, CardDescription, CardTitle } from "@buildingai/ui/components/ui/card";
import { Info } from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="gap-0 py-4">
          <CardTitle className="px-4">用户统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-4 flex flex-col gap-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">123980</span>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardTitle className="px-4">订单统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-4 flex flex-col gap-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">123980</span>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardTitle className="px-4">对话统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-4 flex flex-col gap-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">用户总数</span>
              <span className="text-primary text-xl font-bold">123980</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid h-96 grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-0 py-4 lg:col-span-2">
          <CardTitle className="px-4">订单统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-2 px-4">sdasdasdas</CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardTitle className="px-4">对话统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-2 px-4">sdasdasdas</CardContent>
        </Card>
      </div>

      <div className="grid h-96 grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-0 py-4 lg:col-span-2">
          <CardTitle className="px-4">订单统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-2 px-4">sdasdasdas</CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardTitle className="px-4">对话统计</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1 px-4 text-xs">
            <Info className="size-3" />
            <span className="leading-none">这是副标题</span>
          </CardDescription>
          <CardContent className="mt-2 px-4">sdasdasdas</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
