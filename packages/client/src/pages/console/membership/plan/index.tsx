import {
  type MembershipPlanConfigItem,
  useDeleteMembershipPlanMutation,
  useMembershipPlansConfigQuery,
  useSetMembershipPlanStatusMutation,
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
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { EditIcon, MoreHorizontalIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { DataTableFacetedFilter } from "../../order/recharge/_components/data-table-faceted-filter";

const DURATION_LABELS: Record<number, string> = {
  1: "1个月",
  2: "3个月",
  3: "6个月",
  4: "12个月",
  5: "终身",
  6: "自定义",
};

function getDurationLabel(plan: MembershipPlanConfigItem): string {
  if (plan.duration?.value != null && plan.duration?.unit) {
    const unitMap: Record<string, string> = {
      day: "天",
      天: "天",
      month: "月",
      月: "月",
      year: "年",
      年: "年",
    };
    const u = unitMap[plan.duration.unit] || plan.duration.unit;
    return `${plan.duration.value}${u}`;
  }
  return DURATION_LABELS[plan.durationConfig] ?? "—";
}

const statusOptions = [
  { label: "启用", value: "true" },
  { label: "禁用", value: "false" },
];

const MembershipPlanIndexPage = () => {
  const { confirm } = useAlertDialog();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, refetch, isLoading } = useMembershipPlansConfigQuery();
  const plans = data?.plans ?? [];

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchKeyword =
        !searchKeyword || p.name.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchStatus =
        statusFilter === undefined ||
        (statusFilter === "true" && p.status) ||
        (statusFilter === "false" && !p.status);
      return matchKeyword && matchStatus;
    });
  }, [plans, searchKeyword, statusFilter]);

  const hasActiveFilters = useMemo(() => {
    return searchKeyword.trim() !== "" || statusFilter !== undefined;
  }, [searchKeyword, statusFilter]);

  const handleResetFilters = () => {
    setSearchKeyword("");
    setStatusFilter(undefined);
  };

  const setStatusMutation = useSetMembershipPlanStatusMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.status ? "计划已启用" : "计划已禁用");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const deleteMutation = useDeleteMembershipPlanMutation({
    onSuccess: () => {
      toast.success("计划已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const handleToggleStatus = (plan: MembershipPlanConfigItem) => {
    setStatusMutation.mutate({ id: plan.id, status: !plan.status });
  };

  const handleDelete = async (plan: MembershipPlanConfigItem) => {
    await confirm({
      title: "删除计划",
      description: `确定要删除计划「${plan.name}」吗？此操作不可恢复。`,
      confirmVariant: "destructive",
    });
    deleteMutation.mutate(plan.id);
  };

  const handleAdd = () => {
    toast.info("新增计划：可在此处打开新增弹窗或跳转编辑页");
  };

  const handleEdit = (plan: MembershipPlanConfigItem) => {
    toast.info("编辑计划：可在此处打开编辑弹窗或跳转编辑页");
    console.log(plan);
  };

  return (
    <PageContainer className="h-[calc(100vh-6.25rem)]">
      <div className="flex h-full w-full flex-col gap-6">
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 p-1">
              <Input
                placeholder="搜索计划名称"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
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
                  <TableHead>计划名称</TableHead>
                  <TableHead>订阅时长</TableHead>
                  <TableHead>会员等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? "没有找到符合条件的计划，请尝试调整筛选条件"
                        : "暂无订阅计划"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{getDurationLabel(plan)}</TableCell>
                      <TableCell>
                        <span className="inline-flex flex-wrap gap-1">
                          {plan.levels?.filter(Boolean).length
                            ? plan.levels
                                .filter(Boolean)
                                .map((level) => level?.name ?? "-")
                                .join("、")
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.status}
                          onCheckedChange={() => handleToggleStatus(plan)}
                          disabled={setStatusMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>{plan.sort}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(plan)}>
                              <EditIcon className="mr-2 size-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => handleDelete(plan)}
                              disabled={deleteMutation.isPending}
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
      </div>
    </PageContainer>
  );
};

export default MembershipPlanIndexPage;
