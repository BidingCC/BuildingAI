import { useImportMcpServerJson } from "@buildingai/services/web";
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
  jsonString: z.string({ message: "JSON配置必须填写" }).min(1, "JSON配置不能为空"),
});

type FormValues = z.infer<typeof formSchema>;

type McpImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const JSON_EXAMPLE = `{
  "mcpServers": {
    "github": {
      "url": "https://mcp.github.com/sse"
    },
    "slack": {
      "url": "https://mcp.slack.com/sse",
      "headers": {
        "Authorization": "Bearer xxx"
      }
    }
  }
}`;

export const McpImportDialog = ({ open, onOpenChange, onSuccess }: McpImportDialogProps) => {
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

  const importMutation = useImportMcpServerJson();

  const handleSubmit = (values: FormValues) => {
    try {
      JSON.parse(values.jsonString);
    } catch {
      toast.error("JSON格式错误，请检查输入");
      return;
    }

    importMutation.mutate(
      { jsonString: values.jsonString },
      {
        onSuccess: (data) => {
          toast.success(`导入成功，共导入 ${data?.length || 0} 个MCP服务`);
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(`导入失败: ${(error as Error).message}`);
        },
      },
    );
  };

  const handlePasteExample = () => {
    form.setValue("jsonString", JSON_EXAMPLE);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>从JSON导入MCP服务</DialogTitle>
          <DialogDescription>粘贴MCP服务配置的JSON字符串进行批量导入</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0">
            <FormField
              control={form.control}
              name="jsonString"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>JSON配置</FormLabel>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={handlePasteExample}
                    >
                      填入示例
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
                  <FormDescription>支持标准的MCP服务配置格式，包含mcpServers对象</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="animate-spin" />}
                导入
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
