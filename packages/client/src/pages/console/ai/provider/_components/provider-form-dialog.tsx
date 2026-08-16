import { MODEL_TYPE_DESCRIPTIONS, type ModelType } from "@buildingai/ai-sdk/interfaces";
import {
  type AiProvider,
  type CreateAiProviderDto,
  useAllSecretTemplatesQuery,
  useCreateAiProviderMutation,
  useUpdateAiProviderMutation,
} from "@buildingai/services/console";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@buildingai/ui/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight, ChevronsUpDown, FolderKey, Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const MODEL_TYPES = Object.keys(MODEL_TYPE_DESCRIPTIONS) as ModelType[];

const formSchema = z.object({
  provider: z
    .string({ message: "供应商标识参数必须传递" })
    .min(1, "供应商标识不能为空")
    .max(50, "供应商标识不能超过50个字符"),
  name: z
    .string({ message: "供应商名称参数必须传递" })
    .min(1, "供应商名称不能为空")
    .max(100, "供应商名称不能超过100个字符"),
  description: z.string().max(1000, "供应商描述不能超过1000个字符").optional(),
  bindSecretId: z.string({ message: "绑定的密钥配置必须选择" }).min(1, "请绑定一个密钥"),
  supportedModelTypes: z.array(z.string()).min(1, "至少选择一种类型").optional(),
  iconUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().min(0, "排序权重不能小于0").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AiProviderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openSecretManageDialog: () => void;
  provider?: AiProvider | null;
  onSuccess?: () => void;
};

/**
 * AI Provider form dialog component for creating and updating providers
 */
export const AiProviderFormDialog = ({
  open,
  onOpenChange,
  openSecretManageDialog,
  provider,
  onSuccess,
}: AiProviderFormDialogProps) => {
  const isEditMode = !!provider;

  const { data: secretTemplates } = useAllSecretTemplatesQuery();

  const secretGroups = useMemo(() => {
    if (!secretTemplates) return [];

    return secretTemplates
      .map((template) => ({
        id: template.id,
        name: template.name,
        secrets: (template.Secrets || []).map((secret) => ({
          id: secret.id,
          name: secret.name,
          templateId: template.id,
          templateName: template.name,
        })),
      }))
      .filter((group) => group.secrets.length > 0);
  }, [secretTemplates]);

  const secrets = useMemo(() => secretGroups.flatMap((group) => group.secrets), [secretGroups]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      provider: "",
      name: "",
      description: "",
      bindSecretId: "",
      supportedModelTypes: [],
      iconUrl: "",
      isActive: false,
      sortOrder: 0,
    },
  });

  const bindSecretId = form.watch("bindSecretId");
  const canEnable = isEditMode || !!bindSecretId;

  useEffect(() => {
    if (!isEditMode && !bindSecretId) {
      form.setValue("isActive", false);
    }
  }, [isEditMode, bindSecretId, form]);

  useEffect(() => {
    if (open) {
      if (provider) {
        form.reset({
          provider: provider.provider,
          name: provider.name,
          description: provider.description || "",
          bindSecretId: provider.bindSecretId || "",
          supportedModelTypes: provider.supportedModelTypes || [],
          iconUrl: provider.iconUrl || "",
          isActive: provider.isActive,
          sortOrder: provider.sortOrder,
        });
      } else {
        form.reset({
          provider: "",
          name: "",
          description: "",
          bindSecretId: "",
          supportedModelTypes: [],
          iconUrl: "",
          isActive: false,
          sortOrder: 0,
        });
      }
    }
  }, [open, provider, form]);

  const createMutation = useCreateAiProviderMutation({
    onSuccess: () => {
      toast.success("供应商创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateAiProviderMutation({
    onSuccess: () => {
      toast.success("供应商更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const dto: CreateAiProviderDto = {
      provider: values.provider,
      name: values.name,
      description: values.description || undefined,
      bindSecretId: values.bindSecretId,
      supportedModelTypes: (values.supportedModelTypes || []).map((t) =>
        t.toLowerCase(),
      ) as ModelType[],
      iconUrl: values.iconUrl || undefined,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    };

    if (isEditMode && provider) {
      updateMutation.mutate({ id: provider.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const modelTypeAnchor = useComboboxAnchor();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [secretPopoverOpen, setSecretPopoverOpen] = useState(false);
  const [openSecretTemplateId, setOpenSecretTemplateId] = useState<string | null>(null);
  const selectedSecretItemRef = React.useRef<HTMLButtonElement | null>(null);

  const selectedSecret = useMemo(
    () => secrets.find((secret) => secret.id === bindSecretId),
    [bindSecretId, secrets],
  );

  useEffect(() => {
    if (!secretPopoverOpen || !selectedSecret) return;

    const frame = window.requestAnimationFrame(() => {
      selectedSecretItemRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [secretPopoverOpen, selectedSecret, openSecretTemplateId]);

  const handleSecretPopoverOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpenSecretTemplateId(selectedSecret?.templateId ?? null);
    }

    setSecretPopoverOpen(nextOpen);
  };

  const handleSecretTemplateOpenChange = (templateId: string, nextOpen: boolean) => {
    setOpenSecretTemplateId(nextOpen ? templateId : null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setContainer} className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑供应商" : "新增供应商"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改AI供应商的配置信息" : "添加一个新的AI模型供应商"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="iconUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>图标</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onChange={(url) => field.onChange(url ?? "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>启用状态</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="flex gap-4"
                          value={field.value ? "true" : "false"}
                          onValueChange={(v) => field.onChange(v === "true")}
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="true" disabled={!canEnable} />
                            启用
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="false" />
                            禁用
                          </label>
                        </RadioGroup>
                      </FormControl>
                      {!isEditMode && !bindSecretId && (
                        <FormDescription className="text-xs">
                          请先选择密钥配置才能启用供应商
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>供应商标识</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如: openai, deepseek, doubao"
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormDescription>唯一标识符，创建后不可修改</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>供应商名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: OpenAI, DeepSeek, 字节豆包" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="供应商描述信息（可选）"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bindSecretId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel required>绑定密钥</FormLabel>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={openSecretManageDialog}
                        type="button"
                      >
                        <FolderKey />
                        管理密钥
                      </Button>
                    </div>
                    <Popover open={secretPopoverOpen} onOpenChange={handleSecretPopoverOpenChange}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={secretPopoverOpen}
                            className={cn(
                              "w-full justify-between px-2.5 font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <span className="min-w-0 truncate">
                              {selectedSecret ? (
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="truncate">{selectedSecret.name}</span>
                                  <span className="text-muted-foreground shrink-0 text-xs">
                                    ({selectedSecret.templateName})
                                  </span>
                                </span>
                              ) : (
                                "选择密钥配置"
                              )}
                            </span>
                            <ChevronsUpDown className="text-muted-foreground ml-2 shrink-0" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        container={container}
                        className="max-h-80 w-(--radix-popover-trigger-width) gap-0 p-0"
                      >
                        <ScrollArea
                          className="flex min-h-0 flex-1 flex-col rounded-lg"
                          viewportClassName="[&>div]:block! [&>div]:flex-1"
                        >
                          <div className="flex flex-col gap-1 p-1">
                            {secretGroups.length === 0 ? (
                              <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                                暂无可绑定的密钥
                              </div>
                            ) : (
                              secretGroups.map((group) => {
                                const containsSelectedSecret = group.secrets.some(
                                  (secret) => secret.id === field.value,
                                );
                                const isGroupOpen =
                                  openSecretTemplateId === group.id ||
                                  (openSecretTemplateId === null &&
                                    secretPopoverOpen &&
                                    containsSelectedSecret);

                                return (
                                  <Collapsible
                                    key={group.id}
                                    open={isGroupOpen}
                                    onOpenChange={(nextOpen) =>
                                      handleSecretTemplateOpenChange(group.id, nextOpen)
                                    }
                                    className="group/collapsible"
                                  >
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-9 w-full justify-start gap-2 px-2"
                                      >
                                        <ChevronRight className="text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        <span className="min-w-0 flex-1 truncate text-left">
                                          {group.name}
                                        </span>
                                        <Badge variant="secondary" className="shrink-0">
                                          {group.secrets.length}
                                        </Badge>
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="flex flex-col gap-0.5 py-1 pl-6">
                                        {group.secrets.length === 0 ? (
                                          <div className="text-muted-foreground px-2 py-2 text-xs">
                                            该分组暂无密钥
                                          </div>
                                        ) : (
                                          group.secrets.map((secret) => {
                                            const isSelected = secret.id === field.value;

                                            return (
                                              <Button
                                                key={secret.id}
                                                ref={isSelected ? selectedSecretItemRef : undefined}
                                                type="button"
                                                variant="ghost"
                                                className={cn(
                                                  "h-8 w-full justify-start gap-2 px-2 font-normal",
                                                  isSelected && "bg-muted text-foreground",
                                                )}
                                                onClick={() => {
                                                  field.onChange(secret.id);
                                                  setSecretPopoverOpen(false);
                                                }}
                                              >
                                                <span className="min-w-0 flex-1 truncate text-left">
                                                  {secret.name}
                                                </span>
                                                <Check
                                                  data-icon="inline-end"
                                                  className={cn(
                                                    "ml-auto shrink-0",
                                                    isSelected ? "opacity-100" : "opacity-0",
                                                  )}
                                                />
                                              </Button>
                                            );
                                          })
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })
                            )}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supportedModelTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>支持的模型类型</FormLabel>
                    <FormControl>
                      <Combobox
                        multiple
                        autoHighlight
                        items={MODEL_TYPES}
                        value={field.value || []}
                        onValueChange={field.onChange}
                      >
                        <ComboboxChips ref={modelTypeAnchor} className="min-h-9 w-full">
                          <ComboboxValue>
                            {(values: string[]) => (
                              <React.Fragment>
                                {values.map((value: string) => (
                                  <ComboboxChip key={value}>
                                    {MODEL_TYPE_DESCRIPTIONS[value as ModelType]?.nameEn || value}
                                  </ComboboxChip>
                                ))}
                                <ComboboxChipsInput placeholder="选择模型类型..." />
                              </React.Fragment>
                            )}
                          </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent anchor={modelTypeAnchor} container={container}>
                          <ComboboxEmpty>未找到匹配的类型</ComboboxEmpty>
                          <ComboboxList>
                            {(item: string) => (
                              <ComboboxItem key={item} value={item}>
                                {MODEL_TYPE_DESCRIPTIONS[item as ModelType]?.nameEn || item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序权重</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? "保存" : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
