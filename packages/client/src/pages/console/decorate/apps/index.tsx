import { ExtensionStatus } from "@buildingai/constants/shared/extension.constant";
import type { Extension } from "@buildingai/services/console";
import { useExtensionsListQuery, useUpdateExtensionMutation } from "@buildingai/services/console";
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
import { Switch } from "@buildingai/ui/components/ui/switch";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import { Edit, EllipsisVertical, Eye, EyeOff, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/hooks/use-pagination";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { DecorateSettingsDialog } from "./_components/decorate-settings-dialog";

/** 列表项：名称为 alias 或 name，描述为 aliasDescription 或 description，展示图标为 aliasIcon 或 icon */
type AppItem = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  isEnabled: boolean;
  aliasShow: boolean;
};

type StatusBadgeProps = { isEnabled: boolean };

const StatusBadge = ({ isEnabled }: StatusBadgeProps) =>
  isEnabled ? (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      启用
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconXboxXFilled className="fill-destructive" />
      禁用
    </Badge>
  );

type VisibleBadgeProps = { isVisible: boolean };

const VisibleBadge = ({ isVisible }: VisibleBadgeProps) =>
  isVisible ? (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <Eye className="size-3" />
      显示
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <EyeOff className="size-3" />
      隐藏
    </Badge>
  );

function extensionToAppItem(ext: Extension): AppItem {
  return {
    id: ext.id,
    name: ext.alias?.trim() ? ext.alias : ext.name,
    description: ext.aliasDescription?.trim() ? ext.aliasDescription : (ext.description ?? ""),
    icon: ext.aliasIcon ?? ext.icon ?? null,
    isEnabled: ext.status === ExtensionStatus.ENABLED,
    aliasShow: ext.aliasShow ?? true,
  };
}

const PAGE_SIZE = 15;

const DecorateAppsIndexPage = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [decorateDialogOpen, setDecorateDialogOpen] = useState(false);

  const listParams = useMemo(
    () => ({
      keyword: searchKeyword.trim() || undefined,
      status:
        statusFilter === "all"
          ? undefined
          : statusFilter === "enabled"
            ? ExtensionStatus.ENABLED
            : ExtensionStatus.DISABLED,
      page,
      pageSize: PAGE_SIZE,
    }),
    [searchKeyword, statusFilter, page, PAGE_SIZE],
  );

  const { data, isLoading, refetch } = useExtensionsListQuery(listParams);

  const updateExtensionMutation = useUpdateExtensionMutation({
    onSuccess: () => {
      toast.success("展示状态已更新");
      refetch();
    },
    onError: (err) => {
      toast.error(`更新失败: ${err.message}`);
    },
  });

  const { PaginationComponent } = usePagination({
    total: data?.total ?? 0,
    pageSize: PAGE_SIZE,
    page,
    onPageChange: (p) => {
      setPage(p);
      refetch();
    },
  });

  const apps = useMemo(() => {
    const items = (data?.items ?? []) as unknown as Extension[];
    return items.map((ext) => extensionToAppItem(ext));
  }, [data?.items]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleToggleVisible = (app: AppItem) => {
    const nextShow = !app.aliasShow;

    if (!app.isEnabled) {
      toast.error("未启用应用不能修改展示状态");
      return;
    }
    updateExtensionMutation.mutate({
      id: app.id,
      dto: { aliasShow: nextShow },
    });
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder="搜索应用名称"
            className="text-sm"
            value={searchKeyword}
            onChange={handleSearchChange}
          />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="应用状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="col-start-1 justify-self-end sm:col-start-2 lg:col-start-3 xl:col-start-4 2xl:col-start-5"
            variant="ghost"
            onClick={() => setDecorateDialogOpen(true)}
          >
            <Package className="size-4" />
            设置装修位
          </Button>
        </div>

        <DecorateSettingsDialog open={decorateDialogOpen} onOpenChange={setDecorateDialogOpen} />

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
          ) : apps.length > 0 ? (
            apps.map((app) => (
              <div
                key={app.id}
                className="group/app-item bg-card relative flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="relative size-12 rounded-lg after:rounded-lg">
                    <AvatarImage src={app.icon ?? ""} alt={app.name} className="rounded-lg" />
                    <AvatarFallback className="size-12 rounded-lg">
                      <Package className="size-6" />
                    </AvatarFallback>
                    <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/app-item:opacity-100 dark:bg-black/15">
                      <Switch
                        checked={app.aliasShow}
                        onCheckedChange={() => handleToggleVisible(app)}
                        disabled={updateExtensionMutation.isPending}
                      />
                    </div>
                  </Avatar>
                  <div className="min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="line-clamp-1 font-medium">{app.name}</span>
                    <span className="text-muted-foreground line-clamp-2 text-xs">
                      {app.description || "暂无描述"}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit />
                        编辑
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge isEnabled={app.isEnabled} />
                  <VisibleBadge isVisible={app.aliasShow} />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 flex h-28 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
              <span className="text-muted-foreground text-sm">
                {searchKeyword.trim() ? `没有找到与"${searchKeyword}"相关的应用` : "暂无应用数据"}
              </span>
            </div>
          )}
        </div>

        <div className="bg-background sticky bottom-0 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>
      </div>
    </PageContainer>
  );
};

export default DecorateAppsIndexPage;
