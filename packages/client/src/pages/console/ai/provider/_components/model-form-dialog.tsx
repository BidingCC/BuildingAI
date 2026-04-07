import {
  MODEL_FEATURE_DESCRIPTIONS,
  MODEL_FEATURES,
  type ModelFeatureType,
} from "@buildingai/ai-sdk/interfaces";
import { MODEL_TYPE_DESCRIPTIONS, type ModelType } from "@buildingai/ai-sdk/interfaces";
import {
  type AiProviderModel,
  type AiProviderRemoteModelItem,
  type CreateAiModelDto,
  useAiProviderRemoteModelQuery,
  useCreateAiModelMutation,
  useMembershipLevelListQuery,
  useUpdateAiModelMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
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
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@buildingai/ui/components/ui/input-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  Braces,
  Brain,
  FileText,
  ListCheck,
  Loader2,
  PenLine,
  ScanEye,
  Video,
  Waves,
  Workflow,
  Wrench,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const MODEL_TYPES = Object.keys(MODEL_TYPE_DESCRIPTIONS) as ModelType[];
const FEATURE_TYPES = Object.values(MODEL_FEATURES);

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

const billingRuleSchema = z.object({
  power: z.number().int().min(0, "Power cannot be less than 0").default(0),
  tokens: z.number().int().default(1000),
});

const formSchema = z.object({
  name: z
    .string({ message: "Model name is required" })
    .min(1, "Model name is required")
    .max(100, "Model name cannot exceed 100 characters"),
  model: z
    .string({ message: "Model identifier is required" })
    .min(1, "Model identifier is required")
    .max(100, "Model identifier cannot exceed 100 characters"),
  modelType: z.string({ message: "Please select model type" }),
  maxContext: z.number().int().min(1, "Maximum context count cannot be less than 1").optional(),
  features: z.array(z.string()).optional().default([]),
  billingRule: billingRuleSchema,
  membershipLevel: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  thinking: z.boolean().optional(),
  enableThinkingParam: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  sortOrder: z.number().int().min(0, "Sort weight cannot be less than 0").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AiModelFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  model?: AiProviderModel | null;
  onSuccess?: () => void;
};

/**
 * AI Model form dialog component for creating and updating models
 */
export const AiModelFormDialog = ({
  open,
  onOpenChange,
  providerId,
  model,
  onSuccess,
}: AiModelFormDialogProps) => {
  const isEditMode = !!model;
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [useCustomModel, setUseCustomModel] = useState(false);

  const { data: membershipLevels } = useMembershipLevelListQuery(
    {
      pageSize: 100,
      status: "true",
    },
    { enabled: open },
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      model: "",
      modelType: "llm",
      maxContext: 3,
      features: [],
      billingRule: { power: 1, tokens: 1000 },
      membershipLevel: [],
      isActive: true,
      thinking: false,
      enableThinkingParam: false,
      isDefault: false,
      description: "",
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (model) {
        form.reset({
          name: model.name,
          model: model.model,
          modelType: model.modelType,
          maxContext: model.maxContext,
          features: model.features || [],
          billingRule: { power: model.billingRule?.power || undefined, tokens: 1000 },
          membershipLevel: model.membershipLevel || [],
          isActive: model.isActive,
          thinking: model.thinking || false,
          enableThinkingParam: model.enableThinkingParam || false,
          isDefault: false,
          description: model.description || "",
          sortOrder: model.sortOrder,
        });
      } else {
        form.reset({
          name: "",
          model: "",
          modelType: "llm",
          maxContext: 3,
          features: [],
          billingRule: { power: 1, tokens: 1000 },
          membershipLevel: [],
          isActive: true,
          thinking: false,
          enableThinkingParam: false,
          isDefault: false,
          description: "",
          sortOrder: 0,
        });
      }
    }
  }, [open, model, form]);

  const createMutation = useCreateAiModelMutation({
    onSuccess: () => {
      toast.success("模型创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateAiModelMutation({
    onSuccess: () => {
      toast.success("模型更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const dto: CreateAiModelDto = {
      name: values.name,
      providerId,
      model: values.model,
      modelType: values.modelType.toLowerCase() as ModelType,
      maxContext: values.maxContext,
      features: values.features,
      billingRule: values.billingRule,
      membershipLevel: values.membershipLevel,
      isActive: values.isActive,
      thinking: values.thinking,
      enableThinkingParam: values.enableThinkingParam,
      isDefault: values.isDefault,
      description: values.description || undefined,
      sortOrder: values.sortOrder,
    };

    if (isEditMode && model) {
      updateMutation.mutate({ id: model.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const featureAnchor = useComboboxAnchor();
  const membershipAnchor = useComboboxAnchor();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setContainer} className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑模型" : "添加模型"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改AI模型的配置信息" : "为当前供应商添加一个新的AI模型"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>模型名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: GPT-4o, DeepSeek-V3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel required>模型标识符</FormLabel>
                      {!isEditMode && (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                          onClick={() => setUseCustomModel((v) => !v)}
                        >
                          {useCustomModel ? (
                            <span className="flex items-center gap-0.5">
                              <ListCheck className="size-3" />
                              云端选择
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <PenLine className="size-3" />
                              自定义填写
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                    {!isEditMode && !useCustomModel ? (
                      <RemoteModelSelecter
                        providerId={providerId}
                        container={container}
                        value={field.value}
                        onSelect={(id) => {
                          field.onChange(id);
                          if (!form.getValues("name")) {
                            form.setValue("name", id);
                          }
                        }}
                      />
                    ) : (
                      <FormControl>
                        <Input
                          placeholder="例如: gpt-4o, deepseek-chat"
                          {...field}
                          disabled={isEditMode}
                        />
                      </FormControl>
                    )}
                    <FormDescription>API 调用时使用的模型标识，创建后不可修改</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>模型类型</FormLabel>
                    <Select required onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue className="w-full" placeholder="选择模型类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODEL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MODEL_TYPE_DESCRIPTIONS[type].nameEn}
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({MODEL_TYPE_DESCRIPTIONS[type].description})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        placeholder="模型描述信息（可选）"
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
                name="billingRule.power"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>计费规则</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          type="number"
                          min={0}
                          placeholder="请输入模型计费"
                          className="pl-3!"
                          value={field.value ?? ""}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : Number(e.target.value),
                            )
                          }
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>积分 / 1000 Tokens</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>指定会员可用</FormLabel>
                    <FormControl>
                      <Combobox
                        multiple
                        autoHighlight
                        items={membershipLevels?.items || []}
                        value={field.value || []}
                        onValueChange={field.onChange}
                      >
                        <ComboboxChips ref={membershipAnchor} className="min-h-9 w-full">
                          <ComboboxValue>
                            {(values: string[]) => (
                              <React.Fragment>
                                {values.length === 0 && (
                                  <ComboboxChipsInput placeholder="选择会员等级（可选）" />
                                )}
                                {values.map((value: string) => (
                                  <ComboboxChip key={value}>
                                    {membershipLevels?.items?.find((item) => item.id === value)
                                      ?.name || value}
                                  </ComboboxChip>
                                ))}
                                {values.length > 0 && (
                                  <ComboboxChipsInput placeholder="继续选择会员" />
                                )}
                              </React.Fragment>
                            )}
                          </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent anchor={membershipAnchor} container={container}>
                          <ComboboxEmpty>未找到匹配的会员等级</ComboboxEmpty>
                          <ComboboxList>
                            {(item: any) => (
                              <ComboboxItem key={item.id} value={item.id}>
                                {item.name}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormDescription>
                      选择会员等级，该模型将只对指定会员可用。不选择则对所有用户可用
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模型能力</FormLabel>
                    <FormControl>
                      <Combobox
                        multiple
                        autoHighlight
                        items={FEATURE_TYPES}
                        value={field.value || []}
                        onValueChange={field.onChange}
                      >
                        <ComboboxChips ref={featureAnchor} className="min-h-9 w-full">
                          <ComboboxValue>
                            {(values: string[]) => (
                              <React.Fragment>
                                {values.map((value: string) => {
                                  const Icon = FEATURE_ICON_MAP[value];
                                  return (
                                    <ComboboxChip key={value}>
                                      {Icon && <Icon className="size-3" />}
                                      {MODEL_FEATURE_DESCRIPTIONS[value as ModelFeatureType]
                                        ?.label || value}
                                    </ComboboxChip>
                                  );
                                })}
                                <ComboboxChipsInput placeholder="选择模型能力..." />
                              </React.Fragment>
                            )}
                          </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent anchor={featureAnchor} container={container}>
                          <ComboboxEmpty>未找到匹配的能力</ComboboxEmpty>
                          <ComboboxList>
                            {(item: string) => {
                              const Icon = FEATURE_ICON_MAP[item];
                              return (
                                <ComboboxItem key={item} value={item}>
                                  {Icon && <Icon className="size-4" />}
                                  {MODEL_FEATURE_DESCRIPTIONS[item as ModelFeatureType]?.label ||
                                    item}
                                </ComboboxItem>
                              );
                            }}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxContext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最大上下文条数</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="3"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
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
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="mt-0!">{field.value ? "已启用" : "已禁用"}</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thinking"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="mt-0!">允许深度思考</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableThinkingParam"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="mt-0!">传递思考参数</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="mt-0!">设为默认</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

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

const RemoteModelSelecter = ({
  providerId,
  container,
  value,
  onSelect,
}: {
  providerId: string;
  container: HTMLElement | null;
  value?: string;
  onSelect?: (id: string) => void;
}) => {
  const { data: remoteModels, isLoading } = useAiProviderRemoteModelQuery(providerId);

  return (
    <Combobox
      items={remoteModels}
      value={value}
      onValueChange={(val) => {
        if (val && onSelect) onSelect(val);
      }}
    >
      <ComboboxInput placeholder={isLoading ? "加载远程模型中..." : "搜索并选择模型"} />
      <ComboboxContent container={container}>
        <ComboboxEmpty>{isLoading ? "加载中..." : "未找到匹配的模型"}</ComboboxEmpty>
        <ComboboxList>
          {(item: AiProviderRemoteModelItem) => (
            <ComboboxItem key={item.id} value={item.id}>
              {item.id}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
