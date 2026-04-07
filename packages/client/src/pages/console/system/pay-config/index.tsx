import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useI18n } from "@buildingai/i18n";
import {
  type SystemPayConfigItem,
  useSetDefaultSystemPayconfigMutation,
  useSystemPayconfigListQuery,
  useUpdateSystemPayconfigStatusMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
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
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { PayConfigFormDialog } from "./_components/pay-config-form-dialog";

const getPayTypeLabel = (t: (key: string) => string): Record<number, string> => ({
  [PayConfigPayType.WECHAT]: t("system.payConfig.wechat"),
  [PayConfigPayType.ALIPAY]: t("system.payConfig.alipay"),
});

const SystemPayConfigIndexPage = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword] = useDebounceValue(searchKeyword.trim(), 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const { data: payConfigs, isLoading, refetch } = useSystemPayconfigListQuery();

  const updateStatusMutation = useUpdateSystemPayconfigStatusMutation({
    onSuccess: () => {
      toast.success(t("system.payConfig.paymentUpdated"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("system.payConfig.updateFailed", { message: error.message }));
    },
  });

  const filteredConfigs = useMemo(() => {
    if (!payConfigs) return [];
    const PAY_TYPE_LABEL = getPayTypeLabel(t);
    return (payConfigs as SystemPayConfigItem[]).filter((item) => {
      const matchKeyword =
        !debouncedSearchKeyword ||
        item.name.toLowerCase().includes(debouncedSearchKeyword.toLowerCase()) ||
        PAY_TYPE_LABEL[item.payType]?.includes(debouncedSearchKeyword);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && item.isEnable === BooleanNumber.YES) ||
        (statusFilter === "disabled" && item.isEnable === BooleanNumber.NO);

      return matchKeyword && matchStatus;
    });
  }, [payConfigs, debouncedSearchKeyword, statusFilter, t]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  const handleSetDefaultPayconfig = async (item: SystemPayConfigItem) => {
    await confirm({
      title: t("system.payConfig.setDefaultTitle"),
      description: t("system.payConfig.setDefaultConfirm", { name: item.name }),
    });
    setDefaultSystemPayconfigMutation.mutate({ id: item.id });
  };

  const setDefaultSystemPayconfigMutation = useSetDefaultSystemPayconfigMutation({
    onSuccess: () => {
      toast.success(t("system.payConfig.defaultSetSuccess"));
      refetch();
    },
    onError: (error) => {
      console.log(t("system.payConfig.defaultSetFailed", { message: error.message }));
    },
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleToggleEnabled = async (item: SystemPayConfigItem) => {
    const nextEnable = item.isEnable === BooleanNumber.YES ? BooleanNumber.NO : BooleanNumber.YES;

    await confirm({
      title: t("system.payConfig.statusChanged"),
      description:
        nextEnable === BooleanNumber.YES
          ? t("system.payConfig.paymentEnabled")
          : t("system.payConfig.paymentDisabled"),
    });

    updateStatusMutation.mutate({
      id: item.id,
      data: { isEnable: nextEnable },
    });
  };

  return (
    <PageContainer>
      <PermissionGuard permissions="system-payconfig:list">
        <div className="flex flex-col gap-4">
          <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <Input
              placeholder={t("system.payConfig.searchPlaceholder")}
              className="text-sm"
              value={searchKeyword}
              onChange={handleSearchChange}
            />
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("system.payConfig.statusAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("system.payConfig.statusAll")}</SelectItem>
                <SelectItem value="enabled">{t("system.payConfig.statusEnabled")}</SelectItem>
                <SelectItem value="disabled">{t("system.payConfig.statusDisabled")}</SelectItem>
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
                      <PermissionGuard permissions="system-payconfig:update-status">
                        <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/payconfig-item:opacity-100 dark:bg-black/15">
                          <Switch
                            checked={item.isEnable === BooleanNumber.YES}
                            onCheckedChange={() => handleToggleEnabled(item)}
                            disabled={updateStatusMutation.isPending}
                          />
                        </div>
                      </PermissionGuard>
                    </Avatar>

                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                      <span className="line-clamp-1 font-medium">{item.name}</span>
                      <span className="text-muted-foreground line-clamp-1 text-xs">
                        {getPayTypeLabel(t)[item.payType] ?? t("system.payConfig.unknownPayment")}
                      </span>
                    </div>

                    <PermissionGuard
                      permissions={["system-payconfig:update", "system-payconfig:setDefault"]}
                      any
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <PermissionGuard permissions="system-payconfig:update">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingConfigId(item.id);
                                setFormDialogOpen(true);
                              }}
                            >
                              <Edit />
                              {t("system.payConfig.edit")}
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permissions="system-payconfig:setDefault">
                            <DropdownMenuItem
                              disabled={item.isDefault === BooleanNumber.YES}
                              onClick={() => handleSetDefaultPayconfig(item)}
                            >
                              <Star />
                              {t("system.payConfig.setDefault")}
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PermissionGuard>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      active={item.isEnable === BooleanNumber.YES}
                      activeText={t("system.payConfig.enabled")}
                      inactiveText={t("system.payConfig.disabled")}
                    />
                    {item.isDefault === BooleanNumber.YES && (
                      <Badge variant="secondary">{t("system.payConfig.defaultPayment")}</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 flex h-28 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
                <span className="text-muted-foreground text-sm">
                  {searchKeyword
                    ? t("system.payConfig.noResults", { keyword: searchKeyword })
                    : t("system.payConfig.noData")}
                </span>
              </div>
            )}
          </div>
        </div>
      </PermissionGuard>

      <PermissionGuard permissions={["system-payconfig:detail", "system-payconfig:update"]}>
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
      </PermissionGuard>
    </PageContainer>
  );
};

export default SystemPayConfigIndexPage;
