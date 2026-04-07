import { MODEL_FEATURE_DESCRIPTIONS, MODEL_FEATURES } from "@buildingai/ai-sdk/interfaces";
import { useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import {
  type AiProvider,
  type AiProviderModel,
  type QueryAiProviderDto,
  useAiProvidersQuery,
  useDeleteAiModelMutation,
  useDeleteAiProviderMutation,
  useToggleAiModelActiveMutation,
  useToggleAiProviderActiveMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
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
import { StatusBadge } from "@buildingai/ui/components/ui/status-badge";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import {
  Activity,
  Braces,
  Brain,
  ChevronRight,
  Edit,
  EllipsisVertical,
  FileJson2,
  FileText,
  Plus,
  PlusCircle,
  ScanEye,
  Settings,
  Settings2,
  Trash2,
  Video,
  Waves,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { ProviderAvatar } from "@/components/provider-avatar";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { AiModelFormDialog } from "./_components/model-form-dialog";
import { AiProviderFormDialog } from "./_components/provider-form-dialog";
import AiSecretManageDialog from "./_components/secret-manage-dialog";

/**
 * Feature icon mapping for model capabilities
 */
const FEATURE_ICON_MAP: Record<string, React.ElementType> = {
  [MODEL_FEATURES.VISION]: ScanEye,
  [MODEL_FEATURES.AUDIO]: Activity,
  [MODEL_FEATURES.DOCUMENT]: FileText,
  [MODEL_FEATURES.VIDEO]: Video,
  [MODEL_FEATURES.AGENT_THOUGHT]: Brain,
  [MODEL_FEATURES.TOOL_CALL]: Wrench,
  [MODEL_FEATURES.MULTI_TOOL_CALL]: Workflow,
  [MODEL_FEATURES.STREAM_TOOL_CALL]: Waves,
  [MODEL_FEATURES.STRUCTURED_OUTPUT]: Braces,
};

type ModelFeatureBadgesProps = {
  features: string[];
  showLabel?: boolean;
};

/**
 * Reusable model feature badges component
 */
const ModelFeatureBadges = ({ features }: ModelFeatureBadgesProps) => (
  <>
    {Object.entries(FEATURE_ICON_MAP).map(([feature, Icon]) =>
      features.includes(feature) ? (
        <Tooltip key={feature}>
          <TooltipTrigger>
            <Badge variant="outline">
              <Icon />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {
                MODEL_FEATURE_DESCRIPTIONS[feature as keyof typeof MODEL_FEATURE_DESCRIPTIONS]
                  ?.label
              }
            </p>
          </TooltipContent>
        </Tooltip>
      ) : null,
    )}
  </>
);

const AiProviderIndexPage = () => {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [queryParams, setQueryParams] = useState<QueryAiProviderDto>({});
  const [modelStatus, setModelStatus] = useState<"all" | "active" | "inactive">("all");
  const [modelsDialogOpen, setModelsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [modelFormDialogOpen, setModelFormDialogOpen] = useState(false);
  const [secretManageDialogOpen, setSecretManageDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiProviderModel | null>(null);
  const { data, refetch, isLoading } = useAiProvidersQuery(queryParams);
  const { confirm } = useAlertDialog();

  useDocumentHead({
    title: t("ai.provider.meta.title"),
  });

  // Update query params when debounced keyword changes
  useEffect(() => {
    setQueryParams((prev) => ({
      ...prev,
      keyword: debouncedKeyword || undefined,
    }));
  }, [debouncedKeyword]);

  const deleteModelMutation = useDeleteAiModelMutation({
    onSuccess: () => {
      toast.success(t("ai.provider.toast.modelDeleted"));
      handleModelFormSuccess();
    },
    onError: (error) => {
      toast.error(t("ai.provider.toast.modelDeleteFailed", { error: error.message }));
    },
  });

  const handleManageModels = (provider: AiProvider) => {
    setSelectedProvider(provider);
    setModelStatus("all");
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

  const handleModelFormSuccess = async () => {
    const { data: refreshedData } = await refetch();
    if (selectedProvider && refreshedData) {
      const updatedProvider = refreshedData.find((p) => p.id === selectedProvider.id);
      if (updatedProvider) {
        setSelectedProvider(updatedProvider);
      }
    }
  };

  const handleDeleteModel = async (model: AiProviderModel) => {
    await confirm({
      title: t("ai.provider.confirm.deleteModelTitle"),
      description: t("ai.provider.confirm.deleteModelDesc", { name: model.model }),
    });
    deleteModelMutation.mutate(model.id);
  };

  const toggleModelActiveMutation = useToggleAiModelActiveMutation({
    onSuccess: (updatedModel, variables) => {
      toast.success(
        variables.isActive
          ? t("ai.provider.toast.modelEnabled")
          : t("ai.provider.toast.modelDisabled"),
      );
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
  });

  const handleToggleModelActive = (model: AiProviderModel) => {
    toggleModelActiveMutation.mutate({ id: model.id, isActive: !model.isActive });
  };

  const toggleActiveMutation = useToggleAiProviderActiveMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive
          ? t("ai.provider.toast.providerEnabled")
          : t("ai.provider.toast.providerDisabled"),
      );
      refetch();
    },
  });

  const deleteMutation = useDeleteAiProviderMutation({
    onSuccess: () => {
      toast.success(t("ai.provider.toast.providerDeleted"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("ai.provider.toast.modelDeleteFailed", { error: error.message }));
    },
  });

  const handleToggleActive = async (provider: AiProvider) => {
    await confirm({
      title: t("ai.provider.confirm.statusTitle"),
      description: t("ai.provider.confirm.statusDesc", {
        action: provider.isActive
          ? t("ai.provider.confirm.disable")
          : t("ai.provider.confirm.enable"),
      }),
    });
    toggleActiveMutation.mutate({ id: provider.id, isActive: !provider.isActive });
  };

  const handleDelete = async (provider: AiProvider) => {
    if (provider.isBuiltIn) {
      toast.error(t("ai.provider.toast.builtInProviderError"));
      return;
    }
    await confirm({
      title: t("ai.provider.confirm.deleteProviderTitle"),
      description: t("ai.provider.confirm.deleteProviderDesc"),
    });
    deleteMutation.mutate(provider.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      isActive: value === "all" ? undefined : value === "active",
    }));
  };

  const handleModelStatusChange = (value: "all" | "active" | "inactive") => {
    setModelStatus(value);
  };

  const filteredModels = useMemo(() => {
    const models = selectedProvider?.models ?? [];
    if (modelStatus === "all") return models;
    const isActive = modelStatus === "active";
    return models.filter((m) => Boolean(m.isActive) === isActive);
  }, [modelStatus, selectedProvider?.models]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder={t("ai.provider.searchPlaceholder")}
            className="text-sm"
            value={keyword}
            onChange={handleSearchChange}
          />
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("ai.provider.statusOptions.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ai.provider.statusOptions.all")}</SelectItem>
              <SelectItem value="active">{t("ai.provider.statusOptions.active")}</SelectItem>
              <SelectItem value="inactive">{t("ai.provider.statusOptions.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <PermissionGuard permissions="ai-providers:create">
            <div className="bg-card flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
              <div
                className="flex cursor-pointer items-center gap-3"
                onClick={handleOpenCreateDialog}
              >
                <Button className="size-12 rounded-lg border-dashed" variant="outline">
                  <Plus />
                </Button>
                <div className="flex flex-col">
                  <span>{t("ai.provider.actions.addProvider")}</span>
                  <span className="text-muted-foreground py-1 text-xs font-medium">
                    {t("ai.provider.actions.addProviderDesc")}
                  </span>
                </div>
              </div>

              <div className="flex min-h-12 flex-1 items-end gap-4">
                <Button size="xs" className="flex-1" variant="outline" disabled>
                  <FileJson2 /> {t("ai.provider.actions.importConfig")}
                </Button>
                <PermissionGuard permissions="ai-providers:create">
                  <Button
                    size="xs"
                    className="flex-1"
                    variant="outline"
                    onClick={handleOpenCreateDialog}
                  >
                    <Plus /> {t("ai.provider.actions.manualCreate")}
                  </Button>
                </PermissionGuard>
              </div>
            </div>
          </PermissionGuard>

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
                      <PermissionGuard permissions="ai-providers:toggle-active">
                        <Switch
                          checked={provider.isActive}
                          onCheckedChange={() => handleToggleActive(provider)}
                          disabled={toggleActiveMutation.isPending}
                        />
                      </PermissionGuard>
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
                      {t("ai.provider.actions.manageModels", {
                        count: provider.models?.length || 0,
                      })}
                      <ChevronRight />
                    </Button>
                  </div>
                  <PermissionGuard permissions={["ai-providers:update", "ai-providers:delete"]} any>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                          <EllipsisVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <PermissionGuard permissions="ai-providers:update">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(provider)}>
                            <Edit />
                            {t("ai.provider.actions.edit")}
                          </DropdownMenuItem>
                        </PermissionGuard>

                        <DropdownMenuSeparator />

                        <PermissionGuard permissions="ai-providers:delete">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(provider)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 />
                            {t("ai.provider.actions.delete")}
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGuard>
                </div>

                <div className="flex min-h-12 flex-wrap gap-2">
                  <StatusBadge active={provider.isActive} />
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
                  ? t("ai.provider.empty.noResults", { keyword: queryParams.keyword })
                  : t("ai.provider.empty.noData")}
              </span>
            </div>
          )}
        </div>
        <CommandDialog
          open={modelsDialogOpen}
          className="max-sm:h-full max-sm:max-w-full max-sm:rounded-none! max-sm:border-0 sm:max-w-3xl"
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
                <CommandInput
                  className="w-full max-w-lg"
                  placeholder={t("ai.provider.modelList.searchPlaceholder")}
                />
                <div className="p-1 pb-0">
                  <Select value={modelStatus} onValueChange={handleModelStatusChange}>
                    <SelectTrigger className="h-8!">
                      <SelectValue placeholder={t("ai.provider.modelStatusOptions.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("ai.provider.modelStatusOptions.all")}</SelectItem>
                      <SelectItem value="active">
                        {t("ai.provider.modelStatusOptions.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("ai.provider.modelStatusOptions.inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center p-1 pb-0">
                <PermissionGuard permissions="ai-models:create">
                  <Button
                    className="max-sm:hidden"
                    size="sm"
                    variant="ghost"
                    onClick={handleOpenAddModelDialog}
                  >
                    <PlusCircle />
                    {t("ai.provider.actions.addModel")}
                  </Button>
                </PermissionGuard>
                <PermissionGuard permissions="ai-models:create">
                  <Button
                    className="hidden max-sm:flex"
                    size="icon-sm"
                    variant="outline"
                    onClick={handleOpenAddModelDialog}
                  >
                    <PlusCircle />
                  </Button>
                </PermissionGuard>
                <Button
                  className="ml-2"
                  size="icon-sm"
                  variant="secondary"
                  onClick={() => setModelsDialogOpen(false)}
                >
                  <X />
                </Button>
              </div>
            </div>
            <CommandList className="min-h-96 max-sm:max-h-full sm:max-h-96">
              <CommandEmpty>{t("ai.provider.modelList.noModels")}</CommandEmpty>
              {selectedProvider && filteredModels.length > 0 ? (
                <CommandGroup
                  heading={t("ai.provider.modelList.title", { count: filteredModels.length })}
                >
                  {filteredModels.map((model) => (
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
                        <div className="hidden flex-wrap items-center gap-1 md:flex">
                          <Badge variant="outline">
                            {model.modelType.replace("-", " ").toUpperCase()}
                          </Badge>
                          <ModelFeatureBadges features={model.features} />
                          <Badge variant="outline">
                            {model.billingRule?.power
                              ? t("ai.provider.modelFeatures.points", {
                                  points: model.billingRule.power,
                                })
                              : t("ai.provider.modelFeatures.free")}
                          </Badge>
                        </div>
                        <PermissionGuard permissions="ai-models:delete">
                          <Button
                            size="icon-xs"
                            variant="destructive"
                            className="ml-auto group-hover/model-item:flex group-data-selected/model-item:flex! md:hidden"
                            onClick={() => handleDeleteModel(model)}
                          >
                            <Trash2 className="text-destructive!" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permissions="ai-models:update">
                          <Button
                            size="xs"
                            variant="outline"
                            className="group-hover/model-item:flex group-data-selected/model-item:flex! max-sm:w-6 md:hidden"
                            onClick={() => handleOpenEditModelDialog(model)}
                          >
                            <Settings2 />
                            <span className="max-sm:hidden">{t("ai.provider.actions.config")}</span>
                          </Button>
                        </PermissionGuard>
                      </div>
                      <CommandShortcut>
                        <PermissionGuard permissions="ai-models:toggle-active">
                          <Switch
                            checked={model.isActive}
                            onCheckedChange={() => handleToggleModelActive(model)}
                            disabled={toggleModelActiveMutation.isPending}
                          />
                        </PermissionGuard>
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </CommandDialog>

        <AiProviderFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          openSecretManageDialog={() => setSecretManageDialogOpen(true)}
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
      <AiSecretManageDialog
        open={secretManageDialogOpen}
        onOpenChange={setSecretManageDialogOpen}
      />
    </PageContainer>
  );
};

export default AiProviderIndexPage;
