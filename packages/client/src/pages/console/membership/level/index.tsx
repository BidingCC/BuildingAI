import {
  type MembershipLevelListItem,
  useDeleteMembershipLevelMutation,
  useMembershipLevelListQuery,
  useUpdateMembershipLevelMutation,
} from "@buildingai/services/console";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea, ScrollBar } from "@buildingai/ui/components/ui/scroll-area";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import {
  EditIcon,
  HelpCircle,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/hooks/use-pagination";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { DataTableFacetedFilter } from "../../order/recharge/_components/data-table-faceted-filter";

const statusOptions = [
  { label: "启用", value: "true" },
  { label: "禁用", value: "false" },
];

const MembershipLevelIndexPage = () => {
  const { confirm } = useAlertDialog();
  const [nameSearch, setNameSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const hasActiveFilters = useMemo(() => {
    return nameSearch.trim() !== "" || statusFilter !== undefined;
  }, [nameSearch, statusFilter]);

  const handleResetFilters = () => {
    setNameSearch("");
    setStatusFilter(undefined);
    setPage(1);
  };

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      name: nameSearch.trim() || undefined,
      status: statusFilter,
    }),
    [page, pageSize, nameSearch, statusFilter],
  );

  const { data, refetch, isLoading } = useMembershipLevelListQuery(queryParams);

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize,
    page,
    onPageChange: (p) => {
      setPage(p);
      refetch();
    },
  });

  const deleteMutation = useDeleteMembershipLevelMutation({
    onSuccess: () => {
      toast.success("删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateMembershipLevelMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const handleDelete = async (item: MembershipLevelListItem) => {
    await confirm({
      title: "删除等级",
      description: `确定要删除等级「${item.name}」吗？存在未过期订阅用户时无法删除。`,
      confirmVariant: "destructive",
    });
    await deleteMutation.mutateAsync(item.id);
  };

  const handleAdd = () => {
    toast.info("新增等级功能：可在此处打开新增弹窗或跳转编辑页");
  };

  const handleEdit = (item: MembershipLevelListItem) => {
    toast.info("编辑等级功能：可在此处打开编辑弹窗或跳转编辑页");
    console.log(item);
  };

  return (
    <PageContainer className="h-[calc(100vh-6.25rem)]">
      <div className="flex h-full w-full flex-col gap-6">
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 p-1">
              <Input
                placeholder="搜索等级名称"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className="h-8 w-[200px]"
              />
              <DataTableFacetedFilter
                title="启用状态"
                options={statusOptions}
                selectedValue={statusFilter}
                onSelectionChange={setStatusFilter}
              />

              {hasActiveFilters && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                      <RotateCcwIcon className="mr-2 size-4" />
                      清除筛选
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>清除所有筛选？</AlertDialogTitle>
                      <AlertDialogDescription>
                        这将清除所有已设置的筛选条件，包括搜索输入和筛选选项。
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
            <Button size="sm" className="h-8" onClick={handleAdd}>
              <PlusIcon className="mr-2 size-4" />
              新增
            </Button>
          </div>
          <ScrollArea className="flex h-full flex-1 overflow-hidden rounded-md">
            <Table className="h-full">
              <TableHeader className="bg-muted sticky top-0 z-10 border">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1.5">
                      <span>等级</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="text-muted-foreground size-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>等级数值越大表示等级越高</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>等级图标</TableHead>
                  <TableHead>等级名称</TableHead>
                  <TableHead>等级描述</TableHead>
                  <TableHead>每月赠送积分</TableHead>
                  <TableHead>用户数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : !data?.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? "没有找到符合条件的等级，请尝试调整筛选条件"
                        : "暂无等级数据"}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.level}</TableCell>
                      <TableCell>
                        <Avatar className="size-8 rounded-lg after:rounded-lg">
                          <AvatarImage
                            src={item.icon ?? undefined}
                            alt={item.name}
                            className="rounded-lg object-contain"
                          />
                          <AvatarFallback className="rounded-lg">
                            {item.name?.slice(0, 1) ?? "-"}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description ?? "-"}
                      </TableCell>
                      <TableCell>{item.givePower}</TableCell>
                      <TableCell>{item.accountCount ?? 0}</TableCell>
                      <TableCell>
                        <Switch
                          checked={item.status}
                          onCheckedChange={(checked: boolean | undefined) =>
                            updateMutation.mutate({ id: item.id, body: { status: checked } })
                          }
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(item)}>
                              <EditIcon className="mr-2 size-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => handleDelete(item)}
                            >
                              <Trash2Icon className="mr-2 size-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <div className="bg-background sticky bottom-0 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>
      </div>
    </PageContainer>
  );
};

export default MembershipLevelIndexPage;
