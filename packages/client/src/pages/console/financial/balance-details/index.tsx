import {
  type AccountLogListItem,
  type AccountLogListResponse,
  type QueryAccountLogDto,
  useFinanceAccountLogQuery,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { DataTableFacetedFilter } from "@buildingai/ui/components/ui/data-table-faceted-filter";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea, ScrollBar } from "@buildingai/ui/components/ui/scroll-area";
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
import { cn } from "@buildingai/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

const PAGE_SIZE = 25;

const BalanceDetailsIndexPage = () => {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [accountTypeFilter, setAccountTypeFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  const queryParams = useMemo<QueryAccountLogDto>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword || undefined,
      accountType: accountTypeFilter,
    }),
    [page, debouncedKeyword, accountTypeFilter],
  );

  const { data: rawData, isLoading } = useFinanceAccountLogQuery(queryParams);
  const data = rawData as AccountLogListResponse | undefined;

  const accountTypeOptions = useMemo(() => {
    const lists = data?.accountTypeLists ?? {};
    return Object.entries(lists).map(([value, label]) => ({
      value,
      label: String(label),
    }));
  }, [data?.accountTypeLists]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, accountTypeFilter]);

  const hasActiveFilters = debouncedKeyword !== "" || accountTypeFilter !== undefined;

  const handleResetFilters = () => {
    setKeyword("");
    setAccountTypeFilter(undefined);
    setPage(1);
  };

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize: PAGE_SIZE,
    page,
    onPageChange: setPage,
  });

  const items = data?.items ?? [];

  return (
    <PageContainer className="md:h-inset mx-0">
      <div className="flex h-full w-full flex-col">
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden px-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="搜索用户名/手机号/用户编号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-8 w-full md:w-50"
            />
            <DataTableFacetedFilter
              title="变动类型"
              options={accountTypeOptions}
              selectedValue={accountTypeFilter != null ? String(accountTypeFilter) : undefined}
              onSelectionChange={(v) => {
                setAccountTypeFilter(v != null ? Number(v) : undefined);
                setPage(1);
              }}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center justify-center rounded-md border border-dashed px-3 text-sm"
              >
                清除筛选
              </button>
            )}
          </div>
          <ScrollArea
            className="flex h-full flex-1 overflow-hidden rounded-lg"
            viewportClassName="[&>div]:block!"
          >
            <Table className="h-full">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>用户编号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>变动数量</TableHead>
                  <TableHead>剩余数量</TableHead>
                  <TableHead>变动类型</TableHead>
                  <TableHead>来源/关联</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead>记录时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? "没有找到符合条件的记录，请尝试调整筛选条件"
                        : "暂无余额变动记录"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: AccountLogListItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="w-[120px] font-mono text-xs">
                        {item.user.userNo ?? undefined}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 rounded-lg after:rounded-lg">
                            <AvatarImage
                              src={item.user.avatar ?? undefined}
                              alt={item.user.nickname ?? undefined}
                              className="rounded-lg"
                            />
                            <AvatarFallback className="rounded-lg">
                              {item.nickname?.charAt(0) ?? item.username?.charAt(0) ?? "—"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="max-w-[120px] truncate">
                            {item.user.nickname || item.user.username || "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="tabular-nums">
                        <Badge
                          className={cn(
                            item.action === 1
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                          )}
                        >
                          {item.action === 1 ? "+" : "-"}
                          {item.changeAmount}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{item.leftAmount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.accountTypeDesc}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate text-sm">
                        {item.consumeSourceDesc || item.associationUser || "—"}
                      </TableCell>
                      <TableCell>{item.associationUser}</TableCell>
                      <TableCell>
                        <TimeText value={item.createdAt} variant="datetime" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <div className="bg-background sticky bottom-0 z-2 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>
      </div>
    </PageContainer>
  );
};

export default BalanceDetailsIndexPage;
