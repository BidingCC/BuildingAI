import { useI18n } from "@buildingai/i18n";
import { McpCommunicationType, McpServerType } from "@buildingai/constants/shared/mcp.constant";
import {
  type CreateAiMcpServerDto,
  type McpServer,
  useCheckMcpConnectionMutation,
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
  { value: McpCommunicationType.SSE, label: "SSE (Server-Sent Events)" },
  { value: McpCommunicationType.STREAMABLEHTTP, label: "Streamable HTTP" },
];

const SERVER_TYPES: { value: McpServerType; labelKey: string }[] = [
  { value: McpServerType.SYSTEM, labelKey: "mcp.form.serverType.system" },
  { value: McpServerType.USER, labelKey: "mcp.form.serverType.user" },
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
  type: z.enum(McpServerType).optional(),
  communicationType: z.enum(McpCommunicationType).optional(),
  isDisabled: z.boolean().optional(),
  sortOrder: z.number().min(0, "Sort weight cannot be less than 0").optional(),
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
  const { t } = useI18n();
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
          isDisabled: false,
          sortOrder: 0,
          headers: "",
        });
      }
    }
  }, [open, server, form]);

  const checkConnectionMutation = useCheckMcpConnectionMutation();

  const createMutation = useCreateMcpServerMutation({
    onSuccess: (data) => {
      toast.success(t("mcp.form.toast.createSuccess"));
      onOpenChange(false);
      onSuccess?.();
      checkConnectionMutation.mutate(data.id);
    },
    onError: (error) => {
      toast.error(t("mcp.form.toast.createFailed", { message: error.message }));
    },
  });

  const updateMutation = useUpdateMcpServerMutation({
    onSuccess: () => {
      toast.success(t("mcp.form.toast.updateSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(t("mcp.form.toast.updateFailed", { message: error.message }));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    let headers: Record<string, string> | undefined;
    if (values.headers) {
      try {
        headers = JSON.parse(values.headers);
      } catch {
        toast.error(t("mcp.form.toast.headersError"));
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
          <DialogTitle>{isEditMode ? t("mcp.form.title.edit") : t("mcp.form.title.create")}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("mcp.form.description.edit") : t("mcp.form.description.create")}
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
                      <FormLabel>{t("mcp.form.label.icon")}</FormLabel>
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
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mcp.form.label.sortOrder")}</FormLabel>
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

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("mcp.form.label.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("mcp.form.placeholder.name")} {...field} />
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
                    <FormLabel required>{t("mcp.form.label.url")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("mcp.form.placeholder.url")} {...field} />
                    </FormControl>
                    <FormDescription>{t("mcp.form.description.url")}</FormDescription>
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
                      <FormLabel required>{t("mcp.form.label.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("mcp.form.placeholder.selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {t(type.labelKey)}
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
                      <FormLabel required>{t("mcp.form.label.communicationType")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("mcp.form.placeholder.selectCommunicationType")} />
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
                    <FormLabel>{t("mcp.form.label.alias")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("mcp.form.placeholder.alias")} {...field} />
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
                    <FormLabel>{t("mcp.form.label.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("mcp.form.placeholder.description")}
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
                    <FormLabel>{t("mcp.form.label.headers")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"Authorization": "Bearer xxx"}'
                        className="font-mono text-xs"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("mcp.form.description.headers")}</FormDescription>
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
                      <FormLabel>{t("mcp.form.label.isDisabled")}</FormLabel>
                      <FormDescription>{t("mcp.form.description.isDisabled")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("action.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? t("action.save") : t("action.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
