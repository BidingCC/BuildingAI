import {
  type AiProvider,
  type QueryAiProviderDto,
  useAiProvidersQuery,
  useDeleteAiProviderMutation,
  useToggleAiProviderActiveMutation,
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
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import {
  Brain,
  ChevronRight,
  Edit,
  EllipsisVertical,
  FileJson2,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProviderIcon, providerIconsMap } from "@/components/provider-icons";

const AiProviderIndexPage = () => {
  const [queryParams, setQueryParams] = useState<QueryAiProviderDto>({
    // keyword: "12313",
  });
  const { data, refetch } = useAiProvidersQuery(queryParams);
  const { confirm } = useAlertDialog();

  const toggleActiveMutation = useToggleAiProviderActiveMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "供应商已启用" : "供应商已禁用");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const deleteMutation = useDeleteAiProviderMutation({
    onSuccess: () => {
      toast.success("供应商已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const handleToggleActive = async (provider: AiProvider) => {
    await confirm({
      title: "供应商状态",
      description: `确定要${provider.isActive ? "禁用" : "启用"}该供应商吗？`,
    });
    toggleActiveMutation.mutate({ id: provider.id, isActive: !provider.isActive });
  };

  const handleDelete = async (provider: AiProvider) => {
    if (provider.isBuiltIn) {
      toast.error("系统内置供应商不允许删除");
      return;
    }
    await confirm({
      title: "删除供应商",
      description: "确定要删除该供应商吗？此操作不可恢复。",
    });
    deleteMutation.mutate(provider.id);
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
      isActive: value === "all" ? undefined : value === "active",
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input
          placeholder="搜索供应商名称或厂商标识"
          className="text-sm"
          onChange={handleSearchChange}
        />
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="供应商状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">已启用</SelectItem>
            <SelectItem value="inactive">已禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
          <div className="flex items-center gap-3">
            <Button className="size-12 rounded-lg border-dashed" variant="outline">
              <Plus />
            </Button>
            <div className="flex flex-col">
              <span>新增厂商</span>
              <span className="text-muted-foreground py-1 text-xs font-medium">
                添加新的自定义模型厂商
              </span>
            </div>
          </div>

          <div className="flex min-h-20 flex-1 items-end gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              <FileJson2 /> 从配置文件导入
            </Button>
            <Button size="xs" className="flex-1" variant="outline">
              <Plus /> 手动创建
            </Button>
          </div>
        </div>

        {data && data?.length > 0 ? (
          data.map((provider, index) => (
            <div
              key={index}
              className="group/provider-item bg-card relative flex flex-col gap-4 rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar className="center bg-muted relative size-12 rounded-lg after:rounded-lg">
                  <AvatarImage
                    src={provider.iconUrl}
                    alt={provider.name}
                    className="size-8 rounded-lg"
                  />
                  <AvatarFallback className="size-12 rounded-lg">
                    {Object.keys(providerIconsMap).includes(provider.provider) ? (
                      <ProviderIcon className="size-8" provider={provider.provider} />
                    ) : (
                      <Brain className="size-8" />
                    )}
                  </AvatarFallback>
                  <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/provider-item:opacity-100 dark:bg-black/15">
                    <Switch
                      checked={provider.isActive}
                      onCheckedChange={() => handleToggleActive(provider)}
                      disabled={toggleActiveMutation.isPending}
                    />
                  </div>
                </Avatar>
                <div className="flex flex-col">
                  <span>{provider.name}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground px-0 hover:px-2"
                  >
                    {provider.models?.length || 0}个模型
                    <ChevronRight />
                  </Button>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant={provider.isActive ? "warning" : "default"}
                      onClick={() => handleToggleActive(provider)}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {provider.isActive ? <PowerOff /> : <Power />}
                      {provider.isActive ? "禁用" : "启用"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(provider)}
                      disabled={deleteMutation.isPending || provider.isBuiltIn}
                    >
                      <Trash2 />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                {provider.isActive ? (
                  <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
                    <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                    已启用
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
                    <IconXboxXFilled className="fill-destructive" />
                    已禁用
                  </Badge>
                )}
                {provider.supportedModelTypes.map((type) => (
                  <Badge key={type} variant="secondary">
                    {type.replace("-", " ").toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-1 flex h-46.5 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
            <span className="text-muted-foreground text-sm">
              {queryParams.keyword
                ? `没有找到与"${queryParams.keyword}"相关的供应商`
                : "暂无供应商数据"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiProviderIndexPage;
