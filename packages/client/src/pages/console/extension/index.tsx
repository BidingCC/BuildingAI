import {
  ExtensionStatus,
  ExtensionSupportTerminal,
  type ExtensionSupportTerminalType,
} from "@buildingai/constants/shared/extension.constant";
import {
  buildExtensionConsoleManageUrl,
  type Extension,
  type ExtensionUpgradeContent,
  type ExtensionUpgradeContentResponse,
  fetchExtensionUpgradeContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
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
  CalendarClock,
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

import { PageContainer } from "@/layouts/console/_components/page-container";

import { ActivationInstallDialog } from "./_components/activation-install-dialog";
import { ExtensionDetailSheet } from "./_components/extension-detail-sheet";
import { ExtensionFormDialog } from "./_components/extension-form-dialog";

/**
 * Terminal type label mapping
 */
const TERMINAL_LABEL_MAP: Record<ExtensionSupportTerminalType, string> = {
  [ExtensionSupportTerminal.WEB]: "Web端",
  [ExtensionSupportTerminal.WEIXIN]: "公众号",
  [ExtensionSupportTerminal.H5]: "H5",
  [ExtensionSupportTerminal.MP]: "小程序",
  [ExtensionSupportTerminal.API]: "API端",
};

/**
 * Base URL for opening extension web (dev proxy vs prod same-origin).
 */
function getWebAppBaseUrl(): string {
  return import.meta.env.VITE_DEVELOP_APP_BASE_URL || window.location.origin;
}

type UpgradeDialogState = {
  extension: Extension;
  content: ExtensionUpgradeContentResponse;
};

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];
}

function normalizeUpgradeContentEntry(content: unknown): ExtensionUpgradeContent | null {
  if (!content) {
    return null;
  }

  if (typeof content === "string") {
    return {
      explain: content,
    };
  }

  if (typeof content !== "object" || Array.isArray(content)) {
    return null;
  }

  const record = content as Record<string, unknown>;

  return {
    version: getStringValue(record.version),
    explain: getStringValue(record.explain),
    createdAt: getStringValue(record.createdAt || record.date),
    features: getStringValue(record.features),
    optimize: getStringValue(record.optimize),
    fixs: getStringValue(record.fixs),
    changes: getStringArrayValue(record.changes),
  };
}

function normalizeUpgradeContent(content: ExtensionUpgradeContentResponse) {
  const isUpgradeContent = (
    item: ExtensionUpgradeContent | null,
  ): item is ExtensionUpgradeContent => item !== null;

  const normalized = Array.isArray(content)
    ? content.map((item) => normalizeUpgradeContentEntry(item)).filter(isUpgradeContent)
    : [normalizeUpgradeContentEntry(content)].filter(isUpgradeContent);

  if (normalized.length > 0) {
    return normalized;
  }

  if (content && typeof content === "object" && !Array.isArray(content)) {
    const record = content as Record<string, unknown>;
    if (record.data) {
      return normalizeUpgradeContent(record.data as ExtensionUpgradeContentResponse);
    }
  }

  return [];
}

function splitContentLines(value?: string) {
  return (value || "")
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function UpgradeContentPreview({ content }: { content: ExtensionUpgradeContentResponse }) {
  const versionItems = normalizeUpgradeContent(content);

  if (!versionItems.length) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
        暂无可展示的更新内容
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {versionItems.map((item, index) => {
        const explainLines = splitContentLines(item.explain);
        const featureLines = splitContentLines(item.features);
        const optimizeLines = splitContentLines(item.optimize);
        const fixLines = splitContentLines(item.fixs);
        const changeLines = item.changes?.filter(Boolean) || [];
        const hasDetail =
          explainLines.length ||
          featureLines.length ||
          optimizeLines.length ||
          fixLines.length ||
          changeLines.length;

        return (
          <div
            key={`${item.version || "latest"}-${item.createdAt || index}`}
            className="rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{item.version ? `v${item.version}` : "最新版本"}</Badge>
              {item.createdAt && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CalendarClock className="size-3.5" />
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              )}
            </div>

            {hasDetail ? (
              <div className="mt-3 space-y-3 text-sm">
                {explainLines.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium">更新说明</div>
                    <div className="text-muted-foreground space-y-1">
                      {explainLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {featureLines.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium">新功能</div>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                      {featureLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {optimizeLines.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium">优化</div>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                      {optimizeLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {fixLines.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium">修复</div>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                      {fixLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {changeLines.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium">变更项</div>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                      {changeLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">暂无详细更新说明</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Opens extension console at the first `consoleMenu` route after fetching layout on click
 * (avoids N requests when the list has many extensions). Uses React Query cache so repeat
 * opens reuse the same data without extra network when still fresh.
 */
function ExtensionConsoleManageButton({ identifier }: { identifier: string }) {
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
      const message = error instanceof Error ? error.message : "无法获取插件布局";
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
      管理
    </Button>
  );
}

const ExtensionIndexPage = () => {
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
  const [upgradeDialogState, setUpgradeDialogState] = useState<UpgradeDialogState | null>(null);
  const [previewLoadingIdentifier, setPreviewLoadingIdentifier] = useState<string | null>(null);
  const [upgradingIdentifier, setUpgradingIdentifier] = useState<string | null>(null);
  const { data, refetch, isLoading } = useExtensionsListQuery(queryParams);
  const { confirm } = useAlertDialog();

  const enableMutation = useEnableExtensionMutation({
    onSuccess: () => {
      toast.success("应用已启用");
      refetch();
    },
    onError: (error) => {
      toast.error(`启用失败: ${error.message}`);
    },
  });

  const disableMutation = useDisableExtensionMutation({
    onSuccess: () => {
      toast.success("应用已禁用");
      refetch();
    },
    onError: (error) => {
      toast.error(`禁用失败: ${error.message}`);
    },
  });

  const upgradeMutation = useUpgradeExtensionMutation({
    onSuccess: () => {
      toast.success("应用升级成功");
      setUpgradeDialogState(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`升级失败: ${error.message}`);
    },
    onSettled: () => {
      setUpgradingIdentifier(null);
    },
  });

  const uninstallMutation = useDeleteExtensionMutation({
    onSuccess: () => {
      toast.success("应用已卸载");
      refetch();
    },
    onError: (error) => {
      toast.error(`卸载失败: ${error.message}`);
    },
  });

  const handleToggleStatus = async (extension: Extension) => {
    await confirm({
      title: "应用状态",
      description: `确定要${extension.status === ExtensionStatus.ENABLED ? "禁用" : "启用"}该应用吗？`,
    });
    if (extension.status === ExtensionStatus.ENABLED) {
      disableMutation.mutate(extension.id);
    } else {
      enableMutation.mutate(extension.id);
    }
  };

  const handleUpgrade = async (extension: Extension) => {
    setPreviewLoadingIdentifier(extension.identifier);

    try {
      const content = await fetchExtensionUpgradeContent(extension.identifier);
      setUpgradeDialogState({
        extension,
        content,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "无法获取更新内容";
      toast.error(`获取更新内容失败: ${message}`);
    } finally {
      setPreviewLoadingIdentifier((current) => (current === extension.identifier ? null : current));
    }
  };

  const handleUninstall = async (extension: Extension) => {
    await confirm({
      title: "卸载应用",
      description: "确定要卸载该应用吗？",
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
            placeholder="搜索应用名称或标识符"
            className="text-sm"
            value={keyword}
            onChange={handleSearchChange}
          />
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="应用状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value={String(ExtensionStatus.ENABLED)}>已启用</SelectItem>
              <SelectItem value={String(ExtensionStatus.DISABLED)}>已禁用</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={handleSourceChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="应用来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="local">本地</SelectItem>
              <SelectItem value="market">应用市场</SelectItem>
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
                    <span>安装应用</span>
                    <span className="text-muted-foreground py-1 text-xs font-medium">
                      使用兑换码安装应用到本地
                    </span>
                  </div>
                </div>
              </PermissionGuard>

              <div className="flex min-h-26 flex-1 items-end gap-4">
                <Button size="xs" className="flex-1" variant="outline" onClick={toStore}>
                  获取兑换码
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
                  <Plus /> 本地创建
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
                        平台版本不兼容
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
                          详情
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
                            更新日志
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
                            编辑
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
                          卸载
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex min-h-12 flex-wrap gap-2">
                    <StatusBadge active={extension.status === ExtensionStatus.ENABLED} />

                    <Badge variant="secondary">v{extension.version}</Badge>

                    {extension.supportTerminal?.map((terminal) => (
                      <Badge key={terminal} variant="secondary">
                        {TERMINAL_LABEL_MAP[terminal] || "未知"}
                      </Badge>
                    ))}
                    {extension.isLocal && <Badge variant="secondary">本地</Badge>}
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
                        {extension.author?.name || "未知作者"}
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
                            loading={
                              previewLoadingIdentifier === extension.identifier ||
                              upgradingIdentifier === extension.identifier
                            }
                          >
                            {previewLoadingIdentifier !== extension.identifier &&
                              upgradingIdentifier !== extension.identifier && (
                                <CircleFadingArrowUp />
                              )}
                            升级
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
                              启用
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
                  ? `没有找到与“${queryParams.keyword}”相关的应用`
                  : "暂无应用数据"}
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
      <Dialog
        open={!!upgradeDialogState}
        onOpenChange={(open) => {
          if (!open && !upgradeMutation.isPending) {
            setUpgradeDialogState(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-xl">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>升级应用</DialogTitle>
            <DialogDescription>
              {upgradeDialogState
                ? `即将升级 ${upgradeDialogState.extension.name}，以下是本次更新内容。`
                : "以下是本次更新内容。"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4">
            {upgradeDialogState && <UpgradeContentPreview content={upgradeDialogState.content} />}
          </div>

          <DialogFooter className="px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setUpgradeDialogState(null)}
              disabled={upgradeMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (!upgradeDialogState) {
                  return;
                }

                setUpgradeDialogState(null);
                setUpgradingIdentifier(upgradeDialogState.extension.identifier);
                upgradeMutation.mutate(upgradeDialogState.extension.identifier);
              }}
              loading={upgradeMutation.isPending}
            >
              确认升级
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default ExtensionIndexPage;
