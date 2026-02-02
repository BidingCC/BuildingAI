import {
  type CreateLevelsDto,
  type MembershipLevelListItem,
  useCreateMembershipLevelMutation,
  useUpdateMembershipLevelMutation,
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
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const benefitSchema = z.object({
  icon: z.string().optional(),
  content: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "等级名称必须填写").max(64, "等级名称不能超过64个字符"),
  level: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().int().min(1, "等级级别必须大于等于1")),
  icon: z.string().optional(),
  givePower: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().int().min(0, "每月赠送积分不能为负数"))
    .optional(),
  description: z.string().max(255).optional(),
  benefits: z.array(benefitSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type LevelFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level?: MembershipLevelListItem | null;
  onSuccess?: () => void;
};

const defaultBenefit = { icon: "", content: "" };

export const LevelFormDialog = ({ open, onOpenChange, level, onSuccess }: LevelFormDialogProps) => {
  const isEditMode = !!level;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      level: 1,
      icon: "",
      givePower: 0,
      description: "",
      benefits: [defaultBenefit],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "benefits",
  });

  useEffect(() => {
    if (open) {
      if (level) {
        form.reset({
          name: level.name,
          level: level.level,
          icon: level.icon ?? "",
          givePower: level.givePower ?? 0,
          description: level.description ?? "",
          benefits:
            level.benefits && level.benefits.length > 0
              ? level.benefits.map((b) => ({ icon: b.icon ?? "", content: b.content ?? "" }))
              : [defaultBenefit],
        });
      } else {
        form.reset({
          name: "",
          level: 1,
          icon: "",
          givePower: 0,
          description: "",
          benefits: [defaultBenefit],
        });
      }
    }
  }, [open, level, form]);

  const createMutation = useCreateMembershipLevelMutation({
    onSuccess: () => {
      toast.success("等级创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateMembershipLevelMutation({
    onSuccess: () => {
      toast.success("等级更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const body: CreateLevelsDto = {
      name: values.name,
      level: values.level,
      icon: values.icon || undefined,
      givePower: values.givePower ?? 0,
      description: values.description || undefined,
      benefits: values.benefits?.filter((b) => b.content?.trim())?.length
        ? values.benefits
            ?.filter((b) => b.content?.trim())
            .map((b) => ({ icon: b.icon ?? "", content: b.content!.trim() }))
        : undefined,
    };
    if (isEditMode && level) {
      updateMutation.mutate({ id: level.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑等级" : "新增等级"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改会员等级信息" : "添加一个新的会员等级"}
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
                    <FormLabel>等级名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入等级名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>等级级别</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="数值越大等级越高" {...field} />
                    </FormControl>
                    <FormDescription>等级数值越大表示等级越高</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>等级图标</FormLabel>
                    <FormControl>
                      <Input placeholder="图标 URL 或路径，如 /static/vip/1.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="givePower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>每月赠送积分</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
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
                    <FormLabel>等级描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="简要描述该等级权益"
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>会员权益</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => append(defaultBenefit)}
                  >
                    <Plus className="mr-1 size-4" />
                    添加权益
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  每条权益由图标与文本组成，可添加多条
                </p>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-start gap-2 rounded-lg border p-3"
                    >
                      <FormField
                        control={form.control}
                        name={`benefits.${index}.icon`}
                        render={({ field: iconField }) => (
                          <FormItem className="min-w-[120px] flex-1">
                            <FormLabel className="text-xs">图标</FormLabel>
                            <FormControl>
                              <Input placeholder="图标 URL 或名称" className="h-8" {...iconField} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`benefits.${index}.content`}
                        render={({ field: contentField }) => (
                          <FormItem className="min-w-[140px] flex-2">
                            <FormLabel className="text-xs">权益内容</FormLabel>
                            <FormControl>
                              <Input placeholder="权益描述" className="h-8" {...contentField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive mt-6 size-8 shrink-0"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? "保存" : "新增"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
