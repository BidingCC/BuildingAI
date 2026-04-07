import {
  type CreateMcpServerParams,
  type McpCommunicationType,
  type McpServer,
  useCheckMcpServerConnection,
  useCreateMcpServer,
  useUpdateMcpServer,
} from "@buildingai/services/web";
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
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
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

const COMMUNICATION_TYPES: { value: McpCommunicationType; label: string }[] = [
  { value: "sse", label: "SSE (Server-Sent Events)" },
  { value: "streamable-http", label: "Streamable HTTP" },
];

const formSchema = z.object({
  name: z
    .string({ message: "Service name is required" })
    .min(1, "Service name is required")
    .max(100, "Service name cannot exceed 100 characters"),
  alias: z.string().max(100, "Alias cannot exceed 100 characters").optional(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  url: z
    .string({ message: "Service URL is required" })
    .min(1, "Service URL is required")
    .url("Please enter a valid URL"),
  icon: z.string().optional(),
  communicationType: z.enum(["sse", "streamable-http"]).optional(),
  isDisabled: z.boolean().optional(),
  headers: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type McpFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: McpServer | null;
  onSuccess?: () => void;
};

export const McpFormDialog = ({ open, onOpenChange, server, onSuccess }: McpFormDialogProps) => {
  const isEditMode = !!server;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      alias: "",
      description: "",
      url: "",
      icon: "",
      communicationType: "sse",
      isDisabled: false,
      headers: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (server) {
        form.reset({
          name: server.name,
          alias: server.alias || "",
          description: server.description || "",
          url: server.url || "",
          icon: server.icon || "",
          communicationType: server.communicationType || "sse",
          isDisabled: server.isDisabled,
          headers: server.headers ? JSON.stringify(server.headers, null, 2) : "",
        });
      } else {
        form.reset({
          name: "",
          alias: "",
          description: "",
          url: "",
          icon: "",
          communicationType: "sse",
          isDisabled: false,
          headers: "",
        });
      }
    }
  }, [open, server, form]);

  const createMutation = useCreateMcpServer();
  const updateMutation = useUpdateMcpServer();
  const checkConnectionMutation = useCheckMcpServerConnection();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    let headers: Record<string, string> | undefined;
    if (values.headers) {
      try {
        headers = JSON.parse(values.headers);
      } catch {
        toast.error("请求头格式错误，请输入有效的JSON");
        return;
      }
    }

    const params: CreateMcpServerParams = {
      name: values.name,
      alias: values.alias || undefined,
      description: values.description || undefined,
      url: values.url,
      icon: values.icon || undefined,
      communicationType: values.communicationType,
      isDisabled: values.isDisabled,
      headers,
    };

    if (isEditMode && server) {
      updateMutation.mutate(
        { id: server.id, ...params },
        {
          onSuccess: () => {
            toast.success("MCP服务更新成功");
            onOpenChange(false);
            onSuccess?.();
          },
          onError: (error) => {
            toast.error(`更新失败: ${(error as Error).message}`);
          },
        },
      );
    } else {
      createMutation.mutate(params, {
        onSuccess: (data) => {
          toast.success("MCP服务创建成功，正在检测连接...");
          onOpenChange(false);
          onSuccess?.();
          checkConnectionMutation.mutate(data.id);
        },
        onError: (error) => {
          toast.error(`创建失败: ${(error as Error).message}`);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑MCP服务" : "新增MCP服务"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改MCP服务的配置信息" : "添加一个新的MCP服务"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>图标</FormLabel>
                      <FormControl>
                        <ImageUpload
                          size="sm"
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
                  name="communicationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>通信类型</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择通信类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMMUNICATION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: GitHub MCP, Slack MCP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务地址</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: https://mcp.example.com/sse" {...field} />
                    </FormControl>
                    <FormDescription>MCP服务的SSE或HTTP端点地址</FormDescription>
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
                      <Input placeholder="服务别名（可选）" {...field} />
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
                        placeholder="服务描述信息（可选）"
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
                name="headers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>请求头</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"Authorization": "Bearer xxx"}'
                        className="font-mono text-xs"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>JSON格式的HTTP请求头</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDisabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>禁用状态</FormLabel>
                      <FormDescription>禁用后该服务将不可用</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
