import {
  useAliyunSmsConfigQuery,
  useUpdateAliyunSmsConfigMutation,
  useUpdateSmsConfigStatusMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const aliyunSchema = z.object({
  sign: z.string().min(1, "请输入短信签名"),
  accessKeyId: z.string().min(1, "请输入阿里云accessKey ID"),
  accessKeySecret: z.string().min(1, "请输入阿里云AccessKey Secret"),
});

type AliyunFormValues = z.infer<typeof aliyunSchema>;

/**
 * 阿里云短信配置表单组件。
 */
const AliyunSms = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const aliyunForm = useForm<AliyunFormValues>({
    resolver: zodResolver(aliyunSchema),
    defaultValues: {
      sign: "",
      accessKeyId: "",
      accessKeySecret: "",
    },
  });

  const { data, isLoading, refetch } = useAliyunSmsConfigQuery({});
  const updateStatusMutation = useUpdateSmsConfigStatusMutation("aliyun", {
    onSuccess: (result: any) => {
      setEnabled(Boolean((result as any).enable));
      toast.success("阿里云短信已启用");
      void queryClient.invalidateQueries({ queryKey: ["notice", "sms-config"] });
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "启用阿里云短信失败");
    },
  });
  const updateMutation = useUpdateAliyunSmsConfigMutation({
    onSuccess: (result: any) => {
      toast.success("阿里云短信配置已保存");
      setEnabled(Boolean(result.enable));
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "保存阿里云短信配置失败");
    },
  });

  useEffect(() => {
    if (data) {
      const config = data as any;
      aliyunForm.reset({
        sign: config.sign ?? "",
        accessKeyId: config.accessKeyId ?? "",
        accessKeySecret: config.accessKeySecret ?? "",
      });
      setEnabled(Boolean(config.enable));
    }
  }, [data, aliyunForm]);

  /**
   * 提交保存短信配置。
   */
  const onSubmit = async (values: AliyunFormValues) => {
    setSaving(true);
    updateMutation.mutate(
      {
        ...values,
      },
      {
        onSettled: () => {
          setSaving(false);
        },
      },
    );
  };

  /**
   * 启用阿里云短信。
   */
  const handleEnable = async () => {
    setSaving(true);
    updateStatusMutation.mutate(
      { enable: true },
      {
        onSettled: () => {
          setSaving(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...aliyunForm}>
      <form onSubmit={aliyunForm.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <MessageSquare className="text-primary size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">阿里云短信</span>
              </div>
            </div>
            <PermissionGuard permissions="notice:sms-config-update-status">
              <Button
                type="button"
                size="sm"
                variant={enabled ? "outline" : "default"}
                disabled={enabled || saving}
                onClick={handleEnable}
              >
                {saving && !enabled && <Loader2 className="mr-2 size-4 animate-spin" />}
                {enabled ? "已启用" : "启用"}
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>

        {/* 短信签名 */}
        <FormField
          control={aliyunForm.control}
          name="sign"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>短信签名
              </FormLabel>
              <FormControl>
                <Input placeholder="请输入短信签名" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 阿里云 APP_KEY => accessKeyId */}
        <FormField
          control={aliyunForm.control}
          name="accessKeyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>AccessKey ID
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入阿里云 AccessKey ID
"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 阿里云 SECRET_KEY => accessKeySecret */}
        <FormField
          control={aliyunForm.control}
          name="accessKeySecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>AccessKey Secret
              </FormLabel>
              <FormControl>
                <Input placeholder="请输入阿里云 AccessKey Secret" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <PermissionGuard permissions="notice:sms-config-update-aliyun">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              保存设置
            </Button>
          </PermissionGuard>
          <PermissionGuard permissions="notice:sms-scene-settings-detail">
            <Button asChild type="button" variant="outline">
              <Link to="/console/notice/notification-settings">通知设置</Link>
            </Button>
          </PermissionGuard>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              aliyunForm.reset({
                sign: "",
                accessKeyId: "",
                accessKeySecret: "",
              })
            }
          >
            重置设置
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AliyunSms;
