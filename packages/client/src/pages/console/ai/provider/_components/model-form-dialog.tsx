import {
  MODEL_FEATURES,
  type ModelFeatureType,
} from "@buildingai/ai-sdk-new/interfaces/model-features";
import {
  MODEL_TYPE_DESCRIPTIONS,
  type ModelType,
} from "@buildingai/ai-sdk-new/interfaces/model-type";
import {
  type AiProviderModel,
  type CreateAiModelDto,
  useCreateAiModelMutation,
  useUpdateAiModelMutation,
} from "@buildingai/services/console";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
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
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const MODEL_TYPES = Object.keys(MODEL_TYPE_DESCRIPTIONS) as ModelType[];
const FEATURE_TYPES = Object.keys(MODEL_FEATURES) as ModelFeatureType[];

const billingRuleSchema = z.object({
  power: z.number().int().min(0, "power 不能小于 0"),
  tokens: z.number().int().min(1, "tokens 不能小于 1"),
});

const formSchema = z.object({
  name: z
    .string({ message: "模型名称必须传递" })
    .min(1, "模型名称不能为空")
    .max(100, "模型名称长度不能超过100个字符"),
  model: z
    .string({ message: "模型标识符必须传递" })
    .min(1, "模型标识符不能为空")
    .max(100, "模型标识符长度不能超过100个字符"),
  modelType: z.string({ message: "模型类型必须选择" }),
  maxContext: z.number().int().min(1, "最大上下文条数不能小于 1").optional(),
  features: z.array(z.string()).optional(),
  billingRule: billingRuleSchema,
  membershipLevel: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  description: z.string().max(500, "模型描述长度不能超过500个字符").optional(),
  sortOrder: z.number().int().min(0, "排序权重不能小于0").optional(),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      model: "",
      modelType: "LLM",
      maxContext: 3,
      features: [],
      billingRule: { power: 1, tokens: 1000 },
      membershipLevel: [],
      isActive: true,
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
          billingRule: model.billingRule || { power: 1, tokens: 1000 },
          membershipLevel: model.membershipLevel || [],
          isActive: model.isActive,
          isDefault: false,
          description: model.description || "",
          sortOrder: model.sortOrder,
        });
      } else {
        form.reset({
          name: "",
          model: "",
          modelType: "LLM",
          maxContext: 3,
          features: [],
          billingRule: { power: 1, tokens: 1000 },
          membershipLevel: [],
          isActive: true,
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
      modelType: values.modelType as ModelType,
      maxContext: values.maxContext,
      features: values.features,
      billingRule: values.billingRule,
      membershipLevel: values.membershipLevel,
      isActive: values.isActive,
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

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    const current = form.getValues("features") || [];
    if (checked) {
      form.setValue("features", [...current, feature]);
    } else {
      form.setValue(
        "features",
        current.filter((f) => f !== feature),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
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
                    <FormLabel>模型名称</FormLabel>
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
                    <FormLabel>模型标识符</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如: gpt-4o, deepseek-chat"
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
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
                    <FormLabel>模型类型</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toUpperCase()}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue className="w-full" placeholder="选择模型类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODEL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MODEL_TYPE_DESCRIPTIONS[type].name}
                            <span className="text-muted-foreground ml-2 text-xs">
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
                name="features"
                render={() => (
                  <FormItem>
                    <FormLabel>模型能力</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {FEATURE_TYPES.map((feature) => {
                        const isChecked = (form.watch("features") || []).includes(feature);
                        return (
                          <Button
                            key={feature}
                            type="button"
                            size="sm"
                            variant={isChecked ? "default" : "outline"}
                            onClick={() => handleFeatureToggle(feature, !isChecked)}
                          >
                            {feature}
                          </Button>
                        );
                      })}
                    </div>
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

              <div className="space-y-2">
                <FormLabel>计费规则</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingRule.power"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-xs">消耗算力</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="1"
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
                    name="billingRule.tokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-xs">每 N tokens</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="1000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
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
