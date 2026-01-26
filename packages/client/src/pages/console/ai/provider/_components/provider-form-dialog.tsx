import {
  MODEL_TYPE_DESCRIPTIONS,
  type ModelType,
} from "@buildingai/ai-sdk-new/interfaces/model-type";
import {
  type AiProvider,
  type CreateAiProviderDto,
  useAllSecretTemplatesQuery,
  useCreateAiProviderMutation,
  useUpdateAiProviderMutation,
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
import { useEffect, useMemo } from "react";
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
  bindSecretId: z.string({ message: "绑定的密钥配置必须选择" }),
  supportedModelTypes: z.array(z.string()).optional(),
  iconUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().min(0, "排序权重不能小于0").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AiProviderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: AiProvider | null;
  onSuccess?: () => void;
};

/**
 * AI Provider form dialog component for creating and updating providers
 */
export const AiProviderFormDialog = ({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: AiProviderFormDialogProps) => {
  const isEditMode = !!provider;

  const { data: secretTemplates } = useAllSecretTemplatesQuery();

  const secrets = useMemo(() => {
    if (!secretTemplates) return [];
    return secretTemplates.flatMap((template) =>
      (template.Secrets || []).map((secret) => ({
        id: secret.id,
        name: secret.name,
        templateName: template.name,
      })),
    );
  }, [secretTemplates]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      provider: "",
      name: "",
      description: "",
      bindSecretId: "",
      supportedModelTypes: [],
      iconUrl: "",
      isActive: true,
      sortOrder: 0,
    },
  });

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
          isActive: true,
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
      supportedModelTypes: (values.supportedModelTypes as ModelType[]) || [],
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

  const handleModelTypeToggle = (type: ModelType, checked: boolean) => {
    const current = form.getValues("supportedModelTypes") || [];
    if (checked) {
      form.setValue("supportedModelTypes", [...current, type]);
    } else {
      form.setValue(
        "supportedModelTypes",
        current.filter((t) => t !== type),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑供应商" : "新增供应商"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改AI供应商的配置信息" : "添加一个新的AI模型供应商"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>供应商标识</FormLabel>
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
                    <FormLabel>供应商名称</FormLabel>
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
                    <FormLabel>绑定密钥</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择密钥配置" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {secrets.map((secret) => (
                          <SelectItem key={secret.id} value={secret.id}>
                            {secret.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({secret.templateName})
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
                name="supportedModelTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>支持的模型类型</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {MODEL_TYPES.map((type) => {
                        const isChecked = (form.watch("supportedModelTypes") || []).includes(type);
                        return (
                          <Button
                            key={type}
                            type="button"
                            size="sm"
                            variant={isChecked ? "default" : "outline"}
                            onClick={() => handleModelTypeToggle(type, !isChecked)}
                          >
                            {MODEL_TYPE_DESCRIPTIONS[type].name}
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
                  name="iconUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>图标URL</FormLabel>
                      <FormControl>
                        <Input placeholder="图标地址（可选）" {...field} />
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-center">
                      <FormLabel>启用状态</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full rounded-lg p-4">
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
