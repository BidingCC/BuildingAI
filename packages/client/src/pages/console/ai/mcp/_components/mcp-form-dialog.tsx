import { McpCommunicationType, McpServerType } from "@buildingai/constants/shared/mcp.constant";
import {
  type CreateAiMcpServerDto,
  type McpServer,
  useCreateMcpServerMutation,
  useUpdateMcpServerMutation,
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

const COMMUNICATION_TYPES: { value: McpCommunicationType; label: string }[] = [
  { value: McpCommunicationType.SSE, label: "SSE (Server-Sent Events)" },
  { value: McpCommunicationType.STREAMABLEHTTP, label: "Streamable HTTP" },
];

const SERVER_TYPES: { value: McpServerType; label: string }[] = [
  { value: McpServerType.SYSTEM, label: "系统服务" },
  { value: McpServerType.USER, label: "用户服务" },
];

const formSchema = z.object({
  name: z
    .string({ message: "服务名称必须填写" })
    .min(1, "服务名称不能为空")
    .max(100, "服务名称不能超过100个字符"),
  alias: z.string().max(100, "别名不能超过100个字符").optional(),
  description: z.string().max(1000, "描述不能超过1000个字符").optional(),
  url: z.string({ message: "服务地址必须填写" }).min(1, "服务地址不能为空").url("请输入有效的URL"),
  icon: z.string().url("请输入有效的图标URL").optional().or(z.literal("")),
  type: z.nativeEnum(McpServerType).optional(),
  communicationType: z.nativeEnum(McpCommunicationType).optional(),
  providerName: z.string().max(100, "提供商名称不能超过100个字符").optional(),
  providerUrl: z.string().url("请输入有效的提供商URL").optional().or(z.literal("")),
  providerIcon: z.string().url("请输入有效的提供商图标URL").optional().or(z.literal("")),
  isDisabled: z.boolean().optional(),
  sortOrder: z.number().min(0, "排序权重不能小于0").optional(),
  headers: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type McpFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: McpServer | null;
  onSuccess?: () => void;
};

/**
 * MCP Server form dialog component for creating and updating MCP servers
 */
export const McpFormDialog = ({ open, onOpenChange, server, onSuccess }: McpFormDialogProps) => {
  const isEditMode = !!server;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      alias: "",
      description: "",
      url: "",
      icon: "",
      type: McpServerType.SYSTEM,
      communicationType: McpCommunicationType.SSE,
      providerName: "",
      providerUrl: "",
      providerIcon: "",
      isDisabled: false,
      sortOrder: 0,
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
          type: server.type,
          communicationType: server.communicationType,
          providerName: server.providerName || "",
          providerUrl: server.providerUrl || "",
          providerIcon: server.providerIcon || "",
          isDisabled: server.isDisabled,
          sortOrder: server.sortOrder,
          headers: server.headers ? JSON.stringify(server.headers, null, 2) : "",
        });
      } else {
        form.reset({
          name: "",
          alias: "",
          description: "",
          url: "",
          icon: "",
          type: McpServerType.SYSTEM,
          communicationType: McpCommunicationType.SSE,
          providerName: "",
          providerUrl: "",
          providerIcon: "",
          isDisabled: false,
          sortOrder: 0,
          headers: "",
        });
      }
    }
  }, [open, server, form]);

  const createMutation = useCreateMcpServerMutation({
    onSuccess: () => {
      toast.success("MCP服务创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateMcpServerMutation({
    onSuccess: () => {
      toast.success("MCP服务更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

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

    const dto: CreateAiMcpServerDto = {
      name: values.name,
      alias: values.alias || undefined,
      description: values.description || undefined,
      url: values.url,
      icon: values.icon || undefined,
      type: values.type,
      communicationType: values.communicationType,
      providerName: values.providerName || undefined,
      providerUrl: values.providerUrl || undefined,
      providerIcon: values.providerIcon || undefined,
      isDisabled: values.isDisabled,
      sortOrder: values.sortOrder,
      headers,
    };

    if (isEditMode && server) {
      updateMutation.mutate({ id: server.id, data: dto });
    } else {
      createMutation.mutate(dto);
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>服务类型</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择服务类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVER_TYPES.map((type) => (
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
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

              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground mb-3 text-sm font-medium">提供商信息（可选）</p>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="providerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>提供商名称</FormLabel>
                        <FormControl>
                          <Input placeholder="例如: GitHub, Slack" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="providerUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>提供商网址</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="providerIcon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>提供商图标</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

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
