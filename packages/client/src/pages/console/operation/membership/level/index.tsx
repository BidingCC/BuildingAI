import { useI18n } from "@buildingai/i18n";
import {
  type MembershipLevelListItem,
  type MembershipLevelListResponse,
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
import { DataTableFacetedFilter } from "@buildingai/ui/components/ui/data-table-faceted-filter";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
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

import { PageContainer } from "@/layouts/console/_components/page-container";

import { LevelFormDialog } from "./_components/level-form-dialog";

const MembershipLevelIndexPage = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const [nameSearch, setNameSearch] = useState("");
  const statusOptions = [
    { label: t("common.action.enable"), value: "true" },
    { label: t("common.action.disable"), value: "false" },
  ];
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MembershipLevelListItem | null>(null);
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

  const { data: rawData, refetch, isLoading } = useMembershipLevelListQuery(queryParams);
  const data = rawData as MembershipLevelListResponse | undefined;

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
      toast.success(t("common.action.deleteSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("common.action.deleteFailed", { error: error.message }));
    },
  });

  const updateMutation = useUpdateMembershipLevelMutation({
    onSuccess: () => {
      toast.success(t("operation.membership.level.statusUpdated"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("operation.membership.level.updateFailed", { error: error.message }));
    },
  });

  const handleDelete = async (item: MembershipLevelListItem) => {
    await confirm({
      title: t("operation.membership.level.deleteConfirm"),
      description: t("operation.membership.level.deleteConfirmDesc", { name: item.name }),
      confirmVariant: "destructive",
    });
    await deleteMutation.mutateAsync(item.id);
  };

  const handleAdd = () => {
    setEditingLevel(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (item: MembershipLevelListItem) => {
    setEditingLevel(item);
    setFormDialogOpen(true);
  };

  return (
    <PageContainer className="h-inset">
      <div className="flex h-full w-full flex-col gap-6">
        <div className="flex h-full flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder={t("operation.membership.level.searchPlaceholder")}
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className="h-8 w-[200px]"
              />
              <DataTableFacetedFilter
                title={t("operation.membership.level.statusFilter")}
                options={statusOptions}
                selectedValue={statusFilter}
                onSelectionChange={setStatusFilter}
              />

              {hasActiveFilters && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                      <RotateCcwIcon className="mr-2 size-4" />
                      {t("common.action.clearFilters")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("operation.membership.level.clearFiltersConfirm")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("operation.membership.level.clearFiltersDesc")}
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
              <PlusIcon />
              {t("common.action.add")}
            </Button>
          </div>
          <ScrollArea className="flex h-full flex-1 rounded-lg">
            <Table className="h-full">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1.5">
                      <span>{t("operation.membership.level.table.level")}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground size-3.5 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("operation.membership.level.levelTooltip")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead>{t("operation.membership.level.table.icon")}</TableHead>
                  <TableHead>{t("operation.membership.level.table.name")}</TableHead>
                  <TableHead>{t("operation.membership.level.table.description")}</TableHead>
                  <TableHead>{t("operation.membership.level.table.monthlyPoints")}</TableHead>
                  <TableHead>{t("operation.membership.level.table.users")}</TableHead>
                  <TableHead>{t("operation.membership.level.table.status")}</TableHead>
                  <TableHead>{t("operation.membership.level.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                      {t("operation.membership.level.loading")}
                    </TableCell>
                  </TableRow>
                ) : !data?.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                      {hasActiveFilters
                        ? t("operation.membership.level.noResults")
                        : t("operation.membership.level.noData")}
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
                              {t("common.action.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => handleDelete(item)}
                            >
                              <Trash2Icon className="mr-2 size-4" />
                              {t("common.action.delete")}
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
        <div className="bg-background sticky bottom-0 z-2 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>
      </div>
      <LevelFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        level={editingLevel}
        onSuccess={() => refetch()}
      />
    </PageContainer>
  );
};

export default MembershipLevelIndexPage;
