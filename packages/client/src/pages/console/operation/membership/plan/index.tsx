import { useI18n } from "@buildingai/i18n";
import {
  type MembershipPlanConfigItem,
  useDeleteMembershipPlanMutation,
  useMembershipPlansConfigQuery,
  useSetMembershipConfigMutation,
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
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { DataTableFacetedFilter } from "@buildingai/ui/components/ui/data-table-faceted-filter";
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

import { PlanFormDialog } from "./_components/plan-form-dialog";


interface DurationLabelProps {
  plan: MembershipPlanConfigItem;
}

const DurationLabel: React.FC<DurationLabelProps> = ({ plan }) => {
  const { t } = useI18n();
  
  const durationLabels: Record<number, string> = {
    1: t("operation.membership.plan.durationLabels.1"),
    2: t("operation.membership.plan.durationLabels.2"),
    3: t("operation.membership.plan.durationLabels.3"),
    4: t("operation.membership.plan.durationLabels.4"),
    5: t("operation.membership.plan.durationLabels.5"),
    6: t("operation.membership.plan.durationLabels.6"),
  };
  
  // 仅当订阅时长为「自定义」且存在有效 duration 时显示自定义时长
  if (plan.durationConfig === 6 && plan.duration?.value != null && plan.duration?.unit) {
    const unitMap: Record<string, string> = {
      day: t("operation.membership.plan.unitDay"),
      天: t("operation.membership.plan.unitDay"),
      month: t("operation.membership.plan.unitMonth"),
      月: t("operation.membership.plan.unitMonth"),
      year: t("operation.membership.plan.unitYear"),
      年: t("operation.membership.plan.unitYear"),
    };
    const u = unitMap[plan.duration.unit] || plan.duration.unit;
    return <>{`${plan.duration.value}${u}`}</>;
  }
  
  return <>{durationLabels[plan.durationConfig] ?? "—"}</>;
};

const MembershipPlanIndexPage = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();

  const statusOptions = [
    { label: t("operation.membership.plan.enable"), value: "true" },
    { label: t("operation.membership.plan.disable"), value: "false" },
  ];
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const { data, refetch, isLoading } = useMembershipPlansConfigQuery();
  const plans = data?.plans ?? [];
  const membershipStatus = data?.plansStatus ?? false;

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
      toast.success(
        variables.status
          ? t("operation.membership.plan.planEnabled")
          : t("operation.membership.plan.planDisabled"),
      );
      refetch();
    },
  });

  const setMembershipConfigMutation = useSetMembershipConfigMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.status
          ? t("operation.membership.plan.membershipEnabled")
          : t("operation.membership.plan.membershipDisabled"),
      );
      refetch();
    },
  });

  const deleteMutation = useDeleteMembershipPlanMutation({
    onSuccess: () => {
      toast.success(t("operation.membership.plan.planDeleted"));
      refetch();
    },
  });

  const handleToggleStatus = (plan: MembershipPlanConfigItem) => {
    setStatusMutation.mutate({ id: plan.id, status: !plan.status });
  };

  const handleToggleMembershipStatus = () => {
    setMembershipConfigMutation.mutate({ status: !membershipStatus });
  };

  const handleDelete = async (plan: MembershipPlanConfigItem) => {
    await confirm({
      title: t("operation.membership.plan.deleteConfirm"),
      description: t("operation.membership.plan.deleteConfirmDesc", { name: plan.name }),
      confirmVariant: "destructive",
    });
    deleteMutation.mutate(plan.id);
  };

  const handleAdd = () => {
    setEditingPlanId(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (plan: MembershipPlanConfigItem) => {
    setEditingPlanId(plan.id);
    setFormDialogOpen(true);
  };

  return (
    <PageContainer className="h-inset">
      <div className="flex h-full w-full flex-col gap-6">
        {/* 会员功能总开关 */}
        <div className="pt-0">
          <div className="space-y-2">
            <div className="font-medium">{t("operation.membership.plan.featureStatus")}</div>
            <Switch
              checked={membershipStatus}
              onCheckedChange={handleToggleMembershipStatus}
              disabled={setMembershipConfigMutation.isPending}
            />
            <div className="text-muted-foreground text-sm">
              {t("operation.membership.plan.featureDesc")}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder={t("operation.membership.plan.searchPlaceholder")}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-8 w-[200px]"
              />
              <DataTableFacetedFilter
                title={t("operation.membership.plan.statusFilter")}
                options={statusOptions}
                selectedValue={statusFilter}
                onSelectionChange={setStatusFilter}
              />

              {hasActiveFilters && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                      <RotateCcwIcon className="mr-2 size-4" />
                      {t("operation.membership.plan.clearFilters")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("operation.membership.plan.clearFiltersConfirm")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("operation.membership.plan.clearFiltersDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetFilters}>
                        {t("common.action.clearFilters")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Button size="sm" className="h-8" onClick={handleAdd}>
              <PlusIcon className="mr-2 size-4" />
              {t("common.action.add")}
            </Button>
          </div>
          <ScrollArea className="flex h-full flex-1 rounded-lg">
            <Table className="h-full">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>{t("operation.membership.plan.table.name")}</TableHead>
                  <TableHead>{t("operation.membership.plan.table.duration")}</TableHead>
                  <TableHead>{t("operation.membership.plan.table.level")}</TableHead>
                  <TableHead>{t("operation.membership.plan.table.status")}</TableHead>
                  <TableHead>{t("operation.membership.plan.table.sort")}</TableHead>
                  <TableHead>{t("operation.membership.plan.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      {t("common.common.loading")}
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? t("operation.membership.plan.noResults")
                        : t("operation.membership.plan.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell><DurationLabel plan={plan} /></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {plan.levels?.filter(Boolean).length ? (
                            plan.levels.filter(Boolean).map((level) => (
                              <Badge key={level?.id} variant="secondary" className="font-normal">
                                {level?.name ?? "—"}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
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
                              {t("operation.membership.plan.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => handleDelete(plan)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2Icon className="mr-2 size-4" />
                              {t("operation.membership.plan.delete")}
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
      <PlanFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        planId={editingPlanId}
        onSuccess={() => refetch()}
      />
    </PageContainer>
  );
};

export default MembershipPlanIndexPage;
