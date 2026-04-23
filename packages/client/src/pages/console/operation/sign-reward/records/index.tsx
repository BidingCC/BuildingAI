import { type QuerySignRecordDto, useSignRecordListQuery } from "@buildingai/services/console";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@buildingai/ui/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { Calendar } from "@buildingai/ui/components/ui/calendar";
import { type DateRange } from "@buildingai/ui/components/ui/calendar";
import { Card, CardContent, CardDescription, CardTitle } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { format } from "date-fns";
import { CalendarIcon, RotateCcwIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { PageContainer } from "@/layouts/console/_components/page-container";

export default function SignRewardRecordsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const pageSize = 15;

  const hasActiveFilters = useMemo(() => {
    return keyword.trim() !== "" || date !== undefined;
  }, [keyword, date]);

  const handleResetFilters = () => {
    setKeyword("");
    setDate(undefined);
    setPage(1);
  };

  const queryParams = useMemo<QuerySignRecordDto>(
    () => ({
      page,
      pageSize,
      keyword: keyword.trim() || undefined,
      startTime: date?.from?.toISOString(),
      endTime: date?.to?.toISOString(),
    }),
    [page, pageSize, keyword, date],
  );

  const { data, isLoading } = useSignRecordListQuery(queryParams);
  const extend = data?.extend;

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize,
    page,
    onPageChange: (p) => {
      setPage(p);
    },
  });

  return (
    <PageContainer>
      <div className="space-y-4 px-4 pt-px">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="justify-center">
            <CardContent>
              <CardTitle className="text-center text-2xl font-bold">
                {extend?.todaySignCount ?? 0}
              </CardTitle>
              <CardDescription className="text-center">今日签到人数</CardDescription>
            </CardContent>
          </Card>
          <Card className="justify-center">
            <CardContent>
              <CardTitle className="text-center text-2xl font-bold">
                {extend?.todaySignAward ?? 0}
              </CardTitle>
              <CardDescription className="text-center">今日发放积分</CardDescription>
            </CardContent>
          </Card>
          <Card className="justify-center">
            <CardContent>
              <CardTitle className="text-center text-2xl font-bold">
                {extend?.totalSignAward ?? 0}
              </CardTitle>
              <CardDescription className="text-center">累计发放积分</CardDescription>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="请输入用户信息"
            className="h-8 w-full md:w-50"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date-picker-range"
                className="h-8 justify-start px-2.5 font-normal"
              >
                <CalendarIcon />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>时间范围选择</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  <RotateCcwIcon className="mr-2 size-4" />
                  清除筛选
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-full md:w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>清除所有筛选？</AlertDialogTitle>
                  <AlertDialogDescription>
                    这将清除所有已设置的筛选条件，包括搜索输入和筛选选项。此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetFilters}>清除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <ScrollArea
          className="flex h-full flex-1 overflow-hidden rounded-lg"
          viewportClassName="[&>div]:block!"
        >
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>用户信息</TableHead>
                <TableHead>签到渠道</TableHead>
                <TableHead>签到时间</TableHead>
                <TableHead>积分奖励</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage
                          src={item.user?.avatar || ""}
                          alt={item.user?.nickname || ""}
                          className="rounded-lg"
                        />
                        <AvatarFallback>{item.user?.nickname?.charAt(0) || "签"}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">
                          {item.user?.nickname || item.user?.username || "-"}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {item.user?.phone || item.user?.userNo || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.terminalDesc || "-"}</TableCell>
                    <TableCell>
                      {item.signTime ? (
                        <TimeText value={item.signTime} format="YYYY-MM-DD HH:mm:ss" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{item.signAward ?? 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {hasActiveFilters ? "没有符合筛选条件的签到记录" : "暂无签到记录"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {data && data.total > 0 && <PaginationComponent />}
      </div>
    </PageContainer>
  );
}
