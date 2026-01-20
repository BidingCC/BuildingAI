import {
  ExtensionStatus,
  ExtensionSupportTerminal,
  type ExtensionSupportTerminalType,
} from "@buildingai/constants/shared/extension.constant";
import {
  type Extension,
  type QueryExtensionDto,
  useDeleteExtensionMutation,
  useDisableExtensionMutation,
  useEnableExtensionMutation,
  useExtensionsListQuery,
  useUpgradeExtensionMutation,
} from "@buildingai/services/console";
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
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconPuzzle, IconXboxXFilled } from "@tabler/icons-react";
import {
  CircleFadingArrowUp,
  Edit,
  EllipsisVertical,
  ExternalLink,
  FileText,
  Info,
  Plus,
  Power,
  PowerOff,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Get terminal label
 */
const getTerminalLabel = (terminalType: ExtensionSupportTerminalType): string => {
  const terminalMap: Record<ExtensionSupportTerminalType, string> = {
    [ExtensionSupportTerminal.WEB]: "Web端",
    [ExtensionSupportTerminal.WEIXIN]: "公众号",
    [ExtensionSupportTerminal.H5]: "H5",
    [ExtensionSupportTerminal.MP]: "小程序",
    [ExtensionSupportTerminal.API]: "API端",
  };
  return terminalMap[terminalType] || "未知";
};

const ExtensionIndexPage = () => {
  const [queryParams, setQueryParams] = useState<QueryExtensionDto>({});
  const { data, refetch } = useExtensionsListQuery(queryParams);
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
      refetch();
    },
    onError: (error) => {
      toast.error(`升级失败: ${error.message}`);
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
    await confirm({
      title: "升级应用",
      description: "确定要升级该应用吗？",
    });
    upgradeMutation.mutate(extension.identifier);
  };

  const handleUninstall = async (extension: Extension) => {
    await confirm({
      title: "卸载应用",
      description: "确定要卸载该应用吗？",
    });
    uninstallMutation.mutate(extension.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQueryParams((prev) => ({
      ...prev,
      keyword: value || undefined,
    }));
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

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input placeholder="搜索应用名称或标识符" onChange={handleSearchChange} />
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
        <div className="flex flex-col rounded-lg border border-dashed p-4 hover:border-solid">
          <div className="flex items-center gap-3">
            <Button className="size-12 rounded-lg border-dashed" variant="outline">
              <Plus />
            </Button>
            <div className="flex flex-col">
              <span>安装应用</span>
              <span className="text-muted-foreground py-1 text-xs font-medium">
                使用激活码安装应用到本地
              </span>
            </div>
          </div>

          <div className="flex min-h-20 items-end gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              应用市场获取
              <ExternalLink />
            </Button>
            <Button size="xs" className="flex-1" variant="outline">
              <Plus /> 本地创建
            </Button>
          </div>
        </div>

        {data?.items.map((extension, index) => (
          <div key={index} className="relative flex flex-col rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 after:rounded-lg">
                <AvatarImage src={extension.icon} alt={extension.name} className="rounded-lg" />
                <AvatarFallback className="size-12 rounded-lg">
                  <IconPuzzle />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div>{extension.name}</div>
                {extension.isCompatible ? (
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {extension.description}
                  </p>
                ) : (
                  <p className="text-destructive line-clamp-1 flex items-center gap-0.5 text-xs">
                    <IconXboxXFilled className="fill-destructive size-3.5" />
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
                  <DropdownMenuItem>
                    <Info />
                    详情
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText />
                    更新日志
                  </DropdownMenuItem>
                  {extension.isLocal && (
                    <DropdownMenuItem>
                      <Edit />
                      编辑
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant={extension.status === ExtensionStatus.ENABLED ? "warning" : "default"}
                    onClick={() => handleToggleStatus(extension)}
                    disabled={enableMutation.isPending || disableMutation.isPending}
                  >
                    {extension.status === ExtensionStatus.ENABLED ? <PowerOff /> : <Power />}
                    {extension.status === ExtensionStatus.ENABLED ? "禁用" : "启用"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleUninstall(extension)}
                    disabled={uninstallMutation.isPending}
                  >
                    <Trash2 />
                    卸载
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">v{extension.version}</Badge>

              {extension.status === ExtensionStatus.ENABLED && (
                <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
                  <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                  已启用
                </Badge>
              )}
              {extension.status === ExtensionStatus.DISABLED && (
                <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
                  <IconXboxXFilled className="fill-destructive" />
                  已禁用
                </Badge>
              )}

              {extension.supportTerminal?.map((terminal) => (
                <Badge key={terminal} variant="secondary">
                  {getTerminalLabel(terminal)}
                </Badge>
              ))}
              {extension.isLocal && <Badge variant="secondary">本地</Badge>}

              {/* <Switch className="ml-auto opacity-0 group-hover/provider-item:opacity-100" /> */}
            </div>

            <div className="mt-6 flex items-end justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Avatar className="size-5">
                  <AvatarImage src={extension.author?.avatar} />
                  <AvatarFallback>
                    <User className="size-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="line-clamp-1 text-xs">{extension.author?.name || "未知作者"}</span>
              </div>
              <div className="flex items-center gap-2">
                {extension.status === ExtensionStatus.ENABLED && (
                  <Button size="xs" variant="outline">
                    <Settings />
                    管理
                  </Button>
                )}
                {extension.hasUpdate && extension.isCompatible && (
                  <Button
                    size="xs"
                    onClick={() => handleUpgrade(extension)}
                    disabled={upgradeMutation.isPending}
                  >
                    <CircleFadingArrowUp />
                    升级
                  </Button>
                )}
                {extension.status === ExtensionStatus.DISABLED && extension.isCompatible && (
                  <Button
                    size="xs"
                    onClick={() => handleToggleStatus(extension)}
                    disabled={enableMutation.isPending}
                  >
                    <Power />
                    启用
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtensionIndexPage;
