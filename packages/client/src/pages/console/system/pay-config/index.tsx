import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type SystemPayConfigItem,
  useSetDefaultSystemPayconfigMutation,
  useSystemPayconfigListQuery,
  useUpdateSystemPayconfigStatusMutation,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { StatusBadge } from "@buildingai/ui/components/ui/status-badge";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { CreditCard, Edit, EllipsisVertical, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { PayConfigFormDialog } from "./_components/pay-config-form-dialog";

const PAY_TYPE_LABEL: Record<number, string> = {
  [PayConfigPayType.WECHAT]: "微信支付",
  [PayConfigPayType.ALIPAY]: "支付宝支付",
};

const SystemPayConfigIndexPage = () => {
  const { confirm } = useAlertDialog();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const { data: payConfigs, isLoading, refetch } = useSystemPayconfigListQuery();

  const updateStatusMutation = useUpdateSystemPayconfigStatusMutation({
    onSuccess: () => {
      toast.success("支付配置状态已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const filteredConfigs = useMemo(() => {
    if (!payConfigs) return [];
    return payConfigs.filter((item) => {
      const matchKeyword =
        !searchKeyword ||
        item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        PAY_TYPE_LABEL[item.payType]?.includes(searchKeyword);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && item.isEnable === BooleanNumber.YES) ||
        (statusFilter === "disabled" && item.isEnable === BooleanNumber.NO);

      return matchKeyword && matchStatus;
    });
  }, [payConfigs, searchKeyword, statusFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  const handleSetDefaultPayconfig = async (item: SystemPayConfigItem) => {
    await confirm({
      title: "设置默认支付方式",
      description: `确定要设置「${item.name}」为默认支付方式吗？`,
    });
    setDefaultSystemPayconfigMutation.mutate({ id: item.id });
  };

  const setDefaultSystemPayconfigMutation = useSetDefaultSystemPayconfigMutation({
    onSuccess: () => {
      toast.success("默认支付方式已设置");
      refetch();
    },
    onError: (error) => {
      console.log(`更新失败: ${error.message}`);
    },
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleToggleEnabled = async (item: SystemPayConfigItem) => {
    const nextEnable = item.isEnable === BooleanNumber.YES ? BooleanNumber.NO : BooleanNumber.YES;

    await confirm({
      title: "支付方式状态",
      description: `确定要${nextEnable === BooleanNumber.YES ? "启用" : "禁用"}该支付方式吗？`,
    });

    updateStatusMutation.mutate({
      id: item.id,
      data: { isEnable: nextEnable },
    });
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder="搜索支付方式名称"
            className="text-sm"
            value={searchKeyword}
            onChange={handleSearchChange}
          />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="启用状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card flex h-28 flex-col gap-4 rounded-lg border p-4">
                <div className="flex gap-3">
                  <Skeleton className="size-12 rounded-lg" />
                  <div className="flex h-full flex-1 flex-col justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-2 h-4 w-full" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))
          ) : filteredConfigs.length > 0 ? (
            filteredConfigs.map((item) => (
              <div
                key={item.id}
                className="group/payconfig-item bg-card relative flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="relative size-12 rounded-lg after:rounded-lg">
                    <AvatarImage src={item.logo || ""} alt={item.name} className="rounded-lg" />
                    <AvatarFallback className="size-12 rounded-lg">
                      <CreditCard className="size-6" />
                    </AvatarFallback>
                    <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/payconfig-item:opacity-100 dark:bg-black/15">
                      <Switch
                        checked={item.isEnable === BooleanNumber.YES}
                        onCheckedChange={() => handleToggleEnabled(item)}
                        disabled={updateStatusMutation.isPending}
                      />
                    </div>
                  </Avatar>

                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="line-clamp-1 font-medium">{item.name}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {PAY_TYPE_LABEL[item.payType] ?? "未知支付方式"}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingConfigId(item.id);
                          setFormDialogOpen(true);
                        }}
                      >
                        <Edit />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={item.isDefault === BooleanNumber.YES}
                        onClick={() => handleSetDefaultPayconfig(item)}
                      >
                        <Star />
                        设置默认
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    active={item.isEnable === BooleanNumber.YES}
                    activeText="启用"
                    inactiveText="禁用"
                  />
                  {item.isDefault === BooleanNumber.YES && (
                    <Badge variant="secondary">默认支付方式</Badge>
                  )}
                  <Badge variant="outline" className="text-muted-foreground border-dashed">
                    排序：{item.sort}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 flex h-28 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
              <span className="text-muted-foreground text-sm">
                {searchKeyword ? `没有找到与"${searchKeyword}"相关的支付方式` : "暂无支付配置数据"}
              </span>
            </div>
          )}
        </div>
      </div>

      <PayConfigFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) {
            setEditingConfigId(null);
          }
        }}
        configId={editingConfigId}
        onSuccess={() => {
          refetch();
        }}
      />
    </PageContainer>
  );
};

export default SystemPayConfigIndexPage;
