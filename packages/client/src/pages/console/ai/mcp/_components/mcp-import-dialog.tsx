import { useI18n } from "@buildingai/i18n";
import {
  useBatchCheckMcpConnectionMutation,
  useImportMcpServersFromJsonMutation,
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
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  jsonString: z.string().min(1, "JSON configuration is required"),
});

type FormValues = z.infer<typeof formSchema>;

type McpImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const JSON_EXAMPLE = `{
  "mcpServers": {
    "demo": {
      "url": "https://mcp.example.com/sse",
      "type": "sse"
    }
  }
}`;

/**
 * MCP Server import dialog component for importing from JSON
 */
export const McpImportDialog = ({ open, onOpenChange, onSuccess }: McpImportDialogProps) => {
  const { t } = useI18n();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      jsonString: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ jsonString: "" });
    }
  }, [open, form]);

  const batchCheckMutation = useBatchCheckMcpConnectionMutation();

  const importMutation = useImportMcpServersFromJsonMutation({
    onSuccess: (data) => {
      if (!data) return;

      const { success, total, created, errors } = data;
      const errorMessages = errors
        ?.map((e: { name: string; error: string }) => `${e.name}: ${e.error}`)
        .join("\n");

      if (success) {
        toast.success(t("mcp.import.toast.success", { count: created }));
      } else if (created > 0) {
        toast.warning(
          t("mcp.import.toast.partialSuccess", { total, created, failed: total - created }),
          {
            description: errorMessages,
          },
        );
      } else {
        toast.error(t("mcp.import.toast.allFailed", { total }), {
          description: errorMessages,
        });
        return;
      }

      onOpenChange(false);
      onSuccess?.();

      const createdIds = data.results?.map((r) => r.id).filter(Boolean);
      if (createdIds?.length) {
        batchCheckMutation.mutate({ mcpServerIds: createdIds });
      }
    },
  });

  const handleSubmit = (values: FormValues) => {
    try {
      JSON.parse(values.jsonString);
    } catch {
      toast.error(t("mcp.import.form.errors.jsonFormat"));
      return;
    }

    importMutation.mutate({ jsonString: values.jsonString });
  };

  const handlePasteExample = () => {
    form.setValue("jsonString", JSON_EXAMPLE);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{t("mcp.import.title")}</DialogTitle>
          <DialogDescription>{t("mcp.import.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0">
            <FormField
              control={form.control}
              name="jsonString"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("mcp.import.form.jsonConfig")}</FormLabel>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={handlePasteExample}
                    >
                      {t("mcp.import.form.fillExample")}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder={JSON_EXAMPLE}
                      className="font-mono text-xs"
                      rows={12}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("mcp.import.form.configFormat")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("action.cancel")}
              </Button>
              <Button type="submit" disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="animate-spin" />}
                {t("mcp.import.form.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
