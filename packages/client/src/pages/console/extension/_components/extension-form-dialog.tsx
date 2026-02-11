import {
  type Extension,
  type UpdateExtensionDto,
  useUpdateExtensionMutation,
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
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  name: z
    .string({ message: "应用名称必须填写" })
    .min(1, "应用名称不能为空")
    .max(100, "应用名称不能超过100个字符"),
  alias: z.string().max(100, "别名不能超过100个字符").optional(),
  aliasDescription: z.string().max(500, "别名描述不能超过500个字符").optional(),
  aliasIcon: z.string().url("请输入有效的图标URL").optional().or(z.literal("")),
  aliasShow: z.boolean().optional(),
  description: z.string().max(1000, "描述不能超过1000个字符").optional(),
  homepage: z.string().url("请输入有效的URL").optional().or(z.literal("")),
  documentation: z.string().url("请输入有效的URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

type ExtensionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extension?: Extension | null;
  onSuccess?: () => void;
};

export const ExtensionFormDialog = ({
  open,
  onOpenChange,
  extension,
  onSuccess,
}: ExtensionFormDialogProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      description: "",
      homepage: "",
      documentation: "",
    },
  });

  useEffect(() => {
    if (open && extension) {
      form.reset({
        name: extension.name || "",
        description: extension.description || "",
        homepage: extension.homepage || "",
        documentation: extension.documentation || "",
      });
    }
  }, [open, extension, form]);

  const updateMutation = useUpdateExtensionMutation({
    onSuccess: () => {
      toast.success("应用更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!extension) return;

    const dto: UpdateExtensionDto = {
      name: values.name,
      description: values.description || undefined,
      homepage: values.homepage || undefined,
      documentation: values.documentation || undefined,
    };

    updateMutation.mutate({ id: extension.id, dto });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>编辑应用</DialogTitle>
          <DialogDescription>修改本地应用的基本信息</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>应用名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入应用名称" {...field} />
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
                    <FormLabel>应用描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入应用描述"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>别名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入别名（可选）" {...field} />
                    </FormControl>
                    <FormDescription>用于在前端展示的自定义名称</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aliasDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>别名描述</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入别名描述（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aliasIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>别名图标</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入图标URL（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="homepage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主页</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入主页URL（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>文档</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入文档URL（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="animate-spin" />}
                  保存
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
