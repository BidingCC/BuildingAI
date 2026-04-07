import { useI18n } from "@buildingai/i18n";
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
  sign: z.string().min(1, "Please enter SMS sign"),
  accessKeyId: z.string().min(1, "Please enter Aliyun AccessKey ID"),
  accessKeySecret: z.string().min(1, "Please enter Aliyun AccessKey Secret"),
});

type AliyunFormValues = z.infer<typeof aliyunSchema>;

const AliyunSms = () => {
  const { t } = useI18n();
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
      toast.success(t("notice.aliyunSms.toast.enabled"));
      void queryClient.invalidateQueries({ queryKey: ["notice", "sms-config"] });
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || t("notice.aliyunSms.toast.enableFailed"));
    },
  });
  const updateMutation = useUpdateAliyunSmsConfigMutation({
    onSuccess: (result: any) => {
      toast.success(t("notice.aliyunSms.toast.saved"));
      setEnabled(Boolean(result.enable));
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || t("notice.aliyunSms.toast.saveFailed"));
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
                <span className="text-sm font-medium">{t("notice.aliyunSms.title")}</span>
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
                {enabled ? t("notice.aliyunSms.enabled") : t("notice.aliyunSms.enable")}
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
                <span className="text-destructive">*</span>
                {t("notice.aliyunSms.sign")}
              </FormLabel>
              <FormControl>
                <Input placeholder={t("notice.aliyunSms.sign")} {...field} />
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
                <span className="text-destructive">*</span>
                {t("notice.aliyunSms.accessKeyId")}
              </FormLabel>
              <FormControl>
                <Input placeholder={t("notice.aliyunSms.accessKeyId")} {...field} />
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
                <span className="text-destructive">*</span>
                {t("notice.aliyunSms.accessKeySecret")}
              </FormLabel>
              <FormControl>
                <Input placeholder={t("notice.aliyunSms.accessKeySecret")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <PermissionGuard permissions="notice:sms-config-update-aliyun">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("notice.aliyunSms.saveSettings")}
            </Button>
          </PermissionGuard>
          <PermissionGuard permissions="notice:sms-scene-settings-detail">
            <Button asChild type="button" variant="outline">
              <Link to="/console/notice/notification-settings">
                {t("notice.aliyunSms.notificationSettings")}
              </Link>
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
            {t("notice.aliyunSms.resetSettings")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AliyunSms;
