import {
  ExtensionStatus,
  ExtensionSupportTerminal,
  type ExtensionSupportTerminalType,
} from "@buildingai/constants/shared/extension.constant";
import {
  buildExtensionConsoleManageUrl,
  type Extension,
  fetchPluginLayout,
  getPluginLayoutQueryKey,
  type QueryExtensionDto,
  useDeleteExtensionMutation,
  useDisableExtensionMutation,
  useEnableExtensionMutation,
  useExtensionsListQuery,
  useUpgradeExtensionMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleFadingArrowUp,
  Edit,
  EllipsisVertical,
  ExternalLink,
  FileText,
  Info,
  Plus,
  Power,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { useI18n } from "@buildingai/i18n";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { ActivationInstallDialog } from "./_components/activation-install-dialog";
import { ExtensionDetailSheet } from "./_components/extension-detail-sheet";
import { ExtensionFormDialog } from "./_components/extension-form-dialog";

/**
 * Terminal type label mapping
 */
function useTerminalLabelMap() {
  const { t } = useI18n();
  return {
    [ExtensionSupportTerminal.WEB]: t("extension.terminalLabels.web"),
    [ExtensionSupportTerminal.WEIXIN]: t("extension.terminalLabels.weixin"),
    [ExtensionSupportTerminal.H5]: t("extension.terminalLabels.h5"),
    [ExtensionSupportTerminal.MP]: t("extension.terminalLabels.mp"),
    [ExtensionSupportTerminal.API]: t("extension.terminalLabels.api"),
  } as Record<ExtensionSupportTerminalType, string>;
}

/**
 * Base URL for opening extension web (dev proxy vs prod same-origin).
 */
function getWebAppBaseUrl(): string {
  return import.meta.env.VITE_DEVELOP_APP_BASE_URL || window.location.origin;
}

/**
 * Opens extension console at the first `consoleMenu` route after fetching layout on click
 * (avoids N requests when the list has many extensions). Uses React Query cache so repeat
 * opens reuse the same data without extra network when still fresh.
 */
function ExtensionConsoleManageButton({ identifier }: { identifier: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: getPluginLayoutQueryKey(identifier),
        queryFn: () => fetchPluginLayout(identifier),
      });
      const href = buildExtensionConsoleManageUrl(getWebAppBaseUrl(), identifier, data.consoleMenu);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("extension.toast.getLayoutFailed");
      toast.error(message);
      const fallback = `${getWebAppBaseUrl().replace(/\/+$/u, "")}/extension/${identifier}/console`;
      window.open(fallback, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="xs"
      variant="outline"
      type="button"
      disabled={loading}
      loading={loading}
      onClick={handleClick}
    >
      {loading ? "" : <Settings />}
      {t("extension.actions.manageAction")}
    </Button>
  );
}

const ExtensionIndexPage = () => {
  const { t } = useI18n();
  const terminalLabelMap = useTerminalLabelMap();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [queryParams, setQueryParams] = useState<QueryExtensionDto>({});
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<{
    id: string;
    identifier: string;
    isLocal: boolean;
  } | null>(null);
  const [detailDefaultTab, setDetailDefaultTab] = useState<"overview" | "changelog">("overview");
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const { data, refetch, isLoading } = useExtensionsListQuery(queryParams);
  const { confirm } = useAlertDialog();

  const enableMutation = useEnableExtensionMutation({
    onSuccess: () => {
      toast.success(t("extension.toast.enabled"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("extension.toast.enableFailed", { error: error.message }));
    },
  });

  const disableMutation = useDisableExtensionMutation({
    onSuccess: () => {
      toast.success(t("extension.toast.disabled"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("extension.toast.disableFailed", { error: error.message }));
    },
  });

  const upgradeMutation = useUpgradeExtensionMutation({
    onSuccess: () => {
      toast.success(t("extension.toast.upgradeSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("extension.toast.upgradeFailed", { error: error.message }));
    },
  });

  const uninstallMutation = useDeleteExtensionMutation({
    onSuccess: () => {
      toast.success(t("extension.toast.uninstalled"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("extension.toast.uninstallFailed", { error: error.message }));
    },
  });

  const handleToggleStatus = async (extension: Extension) => {
    await confirm({
      title: t("extension.confirm.statusTitle"),
      description: t("extension.confirm.statusDesc", {
        action:
          extension.status === ExtensionStatus.ENABLED
            ? t("extension.confirm.disable")
            : t("extension.confirm.enable"),
      }),
    });
    if (extension.status === ExtensionStatus.ENABLED) {
      disableMutation.mutate(extension.id);
    } else {
      enableMutation.mutate(extension.id);
    }
  };

  const handleUpgrade = async (extension: Extension) => {
    await confirm({
      title: t("extension.confirm.upgradeTitle"),
      description: t("extension.confirm.upgradeDesc"),
    });
    upgradeMutation.mutate(extension.identifier);
  };

  const handleUninstall = async (extension: Extension) => {
    await confirm({
      title: t("extension.confirm.uninstallTitle"),
      description: t("extension.confirm.uninstallDesc"),
    });
    uninstallMutation.mutate(extension.identifier);
  };

  // Update query params when debounced keyword changes
  useEffect(() => {
    setQueryParams((prev) => ({
      ...prev,
      keyword: debouncedKeyword || undefined,
    }));
  }, [debouncedKeyword]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (Number(value) as QueryExtensionDto["status"]),
    }));
  };

  const handleSourceChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      isLocal: value === "all" ? undefined : value === "local" ? true : false,
    }));
  };

  const toStore = () => {
    window.open("https://buildingai.cc/plugin");
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder={t("extension.searchPlaceholder")}
            className="text-sm"
            value={keyword}
            onChange={handleSearchChange}
          />
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("extension.statusOptions.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("extension.statusOptions.all")}</SelectItem>
              <SelectItem value={String(ExtensionStatus.ENABLED)}>
                {t("extension.statusOptions.enabled")}
              </SelectItem>
              <SelectItem value={String(ExtensionStatus.DISABLED)}>
                {t("extension.statusOptions.disabled")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={handleSourceChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("extension.sourceOptions.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("extension.sourceOptions.all")}</SelectItem>
              <SelectItem value="local">{t("extension.sourceOptions.local")}</SelectItem>
              <SelectItem value="market">{t("extension.sourceOptions.market")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <PermissionGuard permissions="extensions:create">
            <div className="bg-card flex flex-col rounded-lg border border-dashed p-4 hover:border-solid">
              <PermissionGuard permissions="extensions:install-by-activation-code" blockOnly>
                <div
                  className="flex cursor-pointer items-center gap-3"
                  onClick={() => setActivationDialogOpen(true)}
                >
                  <Button className="size-12 rounded-lg border-dashed" variant="outline">
                    <Plus />
                  </Button>
                  <div className="flex flex-col">
                    <span>{t("extension.actions.installApp")}</span>
                    <span className="text-muted-foreground py-1 text-xs font-medium">
                      {t("extension.actions.installDesc")}
                    </span>
                  </div>
                </div>
              </PermissionGuard>

              <div className="flex min-h-26 flex-1 items-end gap-4">
                <Button size="xs" className="flex-1" variant="outline" onClick={toStore}>
                  {t("extension.actions.getActivationCode")}
                  <ExternalLink />
                </Button>
                <Button
                  size="xs"
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setEditingExtension(null);
                    setFormDialogOpen(true);
                  }}
                >
                  <Plus /> {t("extension.actions.createLocal")}
                </Button>
              </div>
            </div>
          </PermissionGuard>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card flex h-46.5 flex-col gap-4 rounded-lg border p-4">
                <div className="flex gap-3">
                  <Skeleton className="size-12" />
                  <div className="flex h-full flex-1 flex-col justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-2 h-4 w-full" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-full rounded-full" />
                </div>

                <div className="mt-auto flex items-end justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
            ))
          ) : data?.items && data?.items.length > 0 ? (
            data?.items.map((extension, index) => (
              <div
                key={index}
                className="bg-card group/extension-item relative flex flex-col gap-4 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="relative size-12 rounded-lg after:rounded-lg">
                    <AvatarImage src={extension.icon} alt={extension.name} className="rounded-lg" />
                    <AvatarFallback className="size-12 rounded-lg">
                      <SvgIcons.puzzle />
                    </AvatarFallback>
                    <PermissionGuard permissions="extensions:extensions:set-status">
                      <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/extension-item:opacity-100 dark:bg-black/15">
                        <Switch
                          checked={extension.status === ExtensionStatus.ENABLED}
                          onCheckedChange={() => handleToggleStatus(extension)}
                          disabled={enableMutation.isPending || disableMutation.isPending}
                        />
                      </div>
                    </PermissionGuard>
                  </Avatar>
                  <div className="flex flex-col">
                    <div>{extension.name}</div>
                    {extension.isCompatible ? (
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {extension.description}
                      </p>
                    ) : (
                      <p className="text-destructive line-clamp-1 flex items-center gap-0.5 text-xs">
                        <SvgIcons.circleXFilled className="fill-destructive size-3.5" />
                        {t("extension.status.incompatible")}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <PermissionGuard permissions="extensions:extensions:dextensions:detail-by-identifier-from-market">
                        <DropdownMenuItem
                          onClick={() => {
                            setDetailTarget({
                              id: extension.id,
                              identifier: extension.identifier,
                              isLocal: extension.isLocal,
                            });
                            setDetailDefaultTab("overview");
                            setDetailSheetOpen(true);
                          }}
                        >
                          <Info />
                          {t("extension.actions.details")}
                        </DropdownMenuItem>
                      </PermissionGuard>
                      <PermissionGuard permissions="extensions:extensions:dextensions:detail-by-identifier-from-market">
                        {!extension.isLocal && (
                          <DropdownMenuItem
                            onClick={() => {
                              setDetailTarget({
                                id: extension.id,
                                identifier: extension.identifier,
                                isLocal: extension.isLocal,
                              });
                              setDetailDefaultTab("changelog");
                              setDetailSheetOpen(true);
                            }}
                          >
                            <FileText />
                            {t("extension.actions.changelog")}
                          </DropdownMenuItem>
                        )}
                      </PermissionGuard>
                      <PermissionGuard permissions="extensions:extensions:extensions:update">
                        {extension.isLocal && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingExtension(extension);
                              setFormDialogOpen(true);
                            }}
                          >
                            <Edit />
                            {t("extension.actions.edit")}
                          </DropdownMenuItem>
                        )}
                      </PermissionGuard>
                      <DropdownMenuSeparator />
                      <PermissionGuard permissions="extensions:extensions:extensions:delete">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleUninstall(extension)}
                          disabled={uninstallMutation.isPending}
                        >
                          <Trash2 />
                          {t("extension.actions.uninstall")}
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex min-h-12 flex-wrap gap-2">
                    <Badge variant="secondary">v{extension.version}</Badge>

                    <StatusBadge active={extension.status === ExtensionStatus.ENABLED} />

                    {extension.supportTerminal?.map((terminal) => (
                      <Badge key={terminal} variant="secondary">
                        {terminalLabelMap[terminal] || t("extension.terminalLabels.unknown")}
                      </Badge>
                    ))}
                    {extension.isLocal && (
                      <Badge variant="secondary">{t("extension.sourceOptions.local")}</Badge>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarImage src={extension.author?.avatar} />
                        <AvatarFallback>
                          <User className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="line-clamp-1 text-xs">
                        {extension.author?.name || t("extension.status.author")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {extension.status === ExtensionStatus.ENABLED && (
                        <ExtensionConsoleManageButton identifier={extension.identifier} />
                      )}
                      <PermissionGuard permissions="extensions:upgrade-content">
                        {extension.hasUpdate && extension.isCompatible && (
                          <Button
                            size="xs"
                            onClick={() => handleUpgrade(extension)}
                            disabled={upgradeMutation.isPending}
                          >
                            <CircleFadingArrowUp />
                            {t("extension.actions.upgrade")}
                          </Button>
                        )}
                      </PermissionGuard>

                      <PermissionGuard permissions="extensions:set-status">
                        {extension.status === ExtensionStatus.DISABLED &&
                          extension.isCompatible && (
                            <Button
                              size="xs"
                              onClick={() => handleToggleStatus(extension)}
                              disabled={enableMutation.isPending}
                            >
                              <Power />
                              {t("extension.actions.enable")}
                            </Button>
                          )}
                      </PermissionGuard>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 flex h-46.5 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
              <span className="text-muted-foreground text-sm">
                {queryParams.keyword
                  ? t("extension.empty.noResults", { keyword: queryParams.keyword })
                  : t("extension.empty.noData")}
              </span>
            </div>
          )}
        </div>
      </div>
      <ExtensionDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        target={detailTarget}
        defaultTab={detailDefaultTab}
      />
      <ExtensionFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        extension={editingExtension}
        onSuccess={refetch}
      />
      <ActivationInstallDialog
        open={activationDialogOpen}
        onOpenChange={setActivationDialogOpen}
        onSuccess={refetch}
      />
    </PageContainer>
  );
};

export default ExtensionIndexPage;
