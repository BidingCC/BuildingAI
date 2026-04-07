import { useI18n } from "@buildingai/i18n";
import { type QueryCardKeyDto, useUsedCardKeyListQuery } from "@buildingai/services/console";
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

/**
 * 卡密使用记录页面
 */
export default function CardKeyRecords() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [keyCodeSearch, setKeyCodeSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const pageSize = 15;

  const hasActiveFilters = useMemo(() => {
    return keyCodeSearch.trim() !== "" || userSearch.trim() !== "" || date !== undefined;
  }, [keyCodeSearch, userSearch, date]);

  const handleResetFilters = () => {
    setKeyCodeSearch("");
    setUserSearch("");
    setDate(undefined);
    setPage(1);
  };

  const queryParams = useMemo<QueryCardKeyDto>(
    () => ({
      page,
      pageSize,
      keyCode: keyCodeSearch.trim() || undefined,
      userId: userSearch.trim() || undefined,
      startTime: date?.from?.toISOString(),
      endTime: date?.to?.toISOString(),
    }),
    [page, pageSize, keyCodeSearch, userSearch, date],
  );

  const { data, refetch, isLoading } = useUsedCardKeyListQuery(queryParams);

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize,
    page,
    onPageChange: (p) => {
      setPage(p);
      refetch();
    },
  });

  return (
    <PageContainer>
      <div className="space-y-4 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("operation.cdk.records.searchCode")}
            className="h-8 w-full md:w-50"
            value={keyCodeSearch}
            onChange={(e) => {
              setKeyCodeSearch(e.target.value);
              setPage(1);
            }}
          />
          <Input
            placeholder={t("operation.cdk.records.searchUser")}
            className="h-8 w-full md:w-50"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
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
                  <span>{t("operation.cdk.records.dateRangeSelect")}</span>
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
                  {t("operation.cdk.records.clearFilters")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-full md:w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("operation.cdk.records.clearFiltersConfirm")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("operation.cdk.records.clearFiltersDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetFilters}>
                    {t("operation.cdk.records.clearFilters")}
                  </AlertDialogAction>
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
                <TableHead>{t("operation.cdk.records.table.batchNo")}</TableHead>
                <TableHead>{t("operation.cdk.records.table.code")}</TableHead>
                <TableHead>{t("operation.cdk.records.table.user")}</TableHead>
                <TableHead>{t("operation.cdk.records.table.redeemType")}</TableHead>
                <TableHead>{t("operation.cdk.records.table.content")}</TableHead>
                <TableHead>{t("operation.cdk.records.table.time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t("operation.cdk.records.loading")}
                  </TableCell>
                </TableRow>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.batch?.batchNo || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.keyCode}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage
                          src={item.user?.avatar || ""}
                          alt={item.user?.nickname || ""}
                          className="rounded-lg"
                        />
                        <AvatarFallback>{item.user?.nickname?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <span>{item.user?.nickname || "-"}</span>
                    </TableCell>
                    <TableCell>{item.batch?.name || "-"}</TableCell>
                    <TableCell>{item.redeemContent || "-"}</TableCell>
                    <TableCell>
                      {item.usedAt ? (
                        <TimeText value={item.usedAt} format="YYYY/MM/DD HH:mm" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t("operation.cdk.records.noData")}
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
