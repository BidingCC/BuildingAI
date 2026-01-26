import { MODEL_FEATURES } from "@buildingai/ai-sdk-new/interfaces/model-features";
import {
  type AiProvider,
  type AiProviderModel,
  type QueryAiProviderDto,
  useAiProvidersQuery,
  useDeleteAiProviderMutation,
  useToggleAiModelActiveMutation,
  useToggleAiProviderActiveMutation,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@buildingai/ui/components/ui/command";
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
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import {
  Activity,
  Brain,
  ChevronRight,
  Edit,
  EllipsisVertical,
  Eye,
  FileJson2,
  Plus,
  PlusCircle,
  Settings,
  Settings2,
  Trash2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProviderIcon, providerIconsMap } from "@/components/provider-icons";

import { AiModelFormDialog } from "./_components/model-form-dialog";
import { AiProviderFormDialog } from "./_components/provider-form-dialog";

/**
 * Feature icon mapping for model capabilities
 */
const FEATURE_ICON_MAP: Record<string, { icon: React.ElementType; label?: string }> = {
  [MODEL_FEATURES.VISION]: { icon: Eye, label: "VISION" },
  [MODEL_FEATURES.AUDIO]: { icon: Activity, label: "AUDIO" },
  [MODEL_FEATURES.DOCUMENT]: { icon: FileJson2, label: "DOCUMENT" },
  [MODEL_FEATURES.VIDEO]: { icon: Video, label: "VIDEO" },
};

type ProviderAvatarProps = {
  provider: string;
  iconUrl?: string;
  name: string;
  size?: "sm" | "md";
  children?: React.ReactNode;
};

/**
 * Reusable provider avatar component
 */
const ProviderAvatar = ({
  provider,
  iconUrl,
  name,
  size = "md",
  children,
}: ProviderAvatarProps) => {
  const sizeClasses = size === "sm" ? "size-8" : "size-12";
  const iconSizeClasses = size === "sm" ? "size-6" : "size-8";

  return (
    <Avatar className={`center bg-muted relative ${sizeClasses} rounded-lg after:rounded-lg`}>
      <AvatarImage src={iconUrl} alt={name} className={`${iconSizeClasses} rounded-lg`} />
      <AvatarFallback className={`${sizeClasses} rounded-lg`}>
        {Object.keys(providerIconsMap).includes(provider) ? (
          <ProviderIcon className={iconSizeClasses} provider={provider} />
        ) : (
          <Brain className={iconSizeClasses} />
        )}
      </AvatarFallback>
      {children}
    </Avatar>
  );
};

type ModelFeatureBadgesProps = {
  features: string[];
  showLabel?: boolean;
};

/**
 * Reusable model feature badges component
 */
const ModelFeatureBadges = ({ features, showLabel = false }: ModelFeatureBadgesProps) => (
  <>
    {Object.entries(FEATURE_ICON_MAP).map(([feature, { icon: Icon, label }]) =>
      features.includes(feature) ? (
        <Badge key={feature} variant="outline">
          <Icon />
          {showLabel && label}
        </Badge>
      ) : null,
    )}
  </>
);

const AiProviderIndexPage = () => {
  const [queryParams, setQueryParams] = useState<QueryAiProviderDto>({});
  const [modelsDialogOpen, setModelsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [modelFormDialogOpen, setModelFormDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiProviderModel | null>(null);
  const { data, refetch, isLoading } = useAiProvidersQuery(queryParams);
  const { confirm } = useAlertDialog();

  const handleManageModels = (provider: AiProvider) => {
    setSelectedProvider(provider);
    setModelsDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setEditingProvider(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (provider: AiProvider) => {
    setEditingProvider(provider);
    setFormDialogOpen(true);
  };

  const handleOpenAddModelDialog = () => {
    setEditingModel(null);
    setModelFormDialogOpen(true);
  };

  const handleOpenEditModelDialog = (model: AiProviderModel) => {
    setEditingModel(model);
    setModelFormDialogOpen(true);
  };

  const handleModelFormSuccess = () => {
    refetch();
    if (selectedProvider) {
      // Refresh selectedProvider data after model update
      const updatedProvider = data?.find((p) => p.id === selectedProvider.id);
      if (updatedProvider) {
        setSelectedProvider(updatedProvider);
      }
    }
  };

  const toggleModelActiveMutation = useToggleAiModelActiveMutation({
    onSuccess: (updatedModel, variables) => {
      toast.success(variables.isActive ? "模型已启用" : "模型已禁用");
      // Update selectedProvider's models locally
      if (selectedProvider) {
        setSelectedProvider({
          ...selectedProvider,
          models: selectedProvider.models?.map((m) =>
            m.id === updatedModel.id ? { ...m, isActive: updatedModel.isActive } : m,
          ),
        });
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const handleToggleModelActive = (model: AiProviderModel) => {
    toggleModelActiveMutation.mutate({ id: model.id, isActive: !model.isActive });
  };

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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

          <div className="flex min-h-12 flex-1 items-end gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              <FileJson2 /> 从配置文件导入
            </Button>
            <Button size="xs" className="flex-1" variant="outline" onClick={handleOpenCreateDialog}>
              <Plus /> 手动创建
            </Button>
          </div>
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-card flex h-36.5 flex-col gap-4 rounded-lg border p-4">
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
            </div>
          ))
        ) : data && data?.length > 0 ? (
          data.map((provider, index) => (
            <div
              key={index}
              className="group/provider-item bg-card relative flex flex-col gap-4 rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <ProviderAvatar
                  provider={provider.provider}
                  iconUrl={provider.iconUrl}
                  name={provider.name}
                >
                  <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/provider-item:opacity-100 dark:bg-black/15">
                    <Switch
                      checked={provider.isActive}
                      onCheckedChange={() => handleToggleActive(provider)}
                      disabled={toggleActiveMutation.isPending}
                    />
                  </div>
                </ProviderAvatar>
                <div className="flex flex-col">
                  <span>{provider.name}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground px-0 hover:px-2"
                    onClick={() => handleManageModels(provider)}
                  >
                    <Settings />
                    管理模型({provider.models?.length || 0})
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
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(provider)}>
                      <Edit />
                      编辑
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(provider)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex min-h-12 flex-wrap gap-2">
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
      <CommandDialog
        open={modelsDialogOpen}
        className="sm:max-w-3xl"
        onOpenChange={setModelsDialogOpen}
      >
        <Command>
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center">
              {selectedProvider && (
                <div className="m-1 mb-0">
                  <ProviderAvatar
                    provider={selectedProvider.provider}
                    iconUrl={selectedProvider.iconUrl}
                    name={selectedProvider.name}
                    size="sm"
                  />
                </div>
              )}
              <CommandInput className="w-full max-w-lg" placeholder="搜索模型名称..." />
            </div>
            <div className="p-1 pb-0">
              <Button className="" size="sm" variant="ghost" onClick={handleOpenAddModelDialog}>
                <PlusCircle />
                添加模型
              </Button>
            </div>
          </div>
          <CommandList className="max-h-96 min-h-96">
            <CommandEmpty>未找到模型</CommandEmpty>
            {selectedProvider && (
              <CommandGroup heading={`模型列表(${selectedProvider.models?.length || 0})`}>
                {selectedProvider.models &&
                  selectedProvider.models.length > 0 &&
                  selectedProvider.models.map((model) => (
                    <CommandItem
                      key={model.id}
                      className="group/model-item flex min-h-9 items-center justify-between"
                    >
                      <span className="hidden break-all md:block">{model.name}</span>
                      <div className="flex flex-col gap-1 md:hidden">
                        <span className="break-all">{model.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">
                            {model.modelType.replace("-", " ").toUpperCase()}
                          </Badge>
                          <ModelFeatureBadges features={model.features} />
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-2">
                        <div className="hidden items-center gap-1 md:flex">
                          <Badge variant="outline">
                            {model.modelType.replace("-", " ").toUpperCase()}
                          </Badge>
                          <ModelFeatureBadges features={model.features} showLabel />
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          className="ml-auto group-hover/model-item:flex group-data-selected/model-item:flex! md:hidden"
                          onClick={() => handleOpenEditModelDialog(model)}
                        >
                          <Settings2 />
                          配置
                        </Button>
                      </div>
                      <CommandShortcut>
                        <Switch
                          checked={model.isActive}
                          onCheckedChange={() => handleToggleModelActive(model)}
                          disabled={toggleModelActiveMutation.isPending}
                        />
                      </CommandShortcut>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>

      <AiProviderFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        provider={editingProvider}
        onSuccess={refetch}
      />

      {selectedProvider && (
        <AiModelFormDialog
          open={modelFormDialogOpen}
          onOpenChange={setModelFormDialogOpen}
          providerId={selectedProvider.id}
          model={editingModel}
          onSuccess={handleModelFormSuccess}
        />
      )}
    </div>
  );
};

export default AiProviderIndexPage;
