import { useI18n } from "@buildingai/i18n";
import {
  useTencentSmsConfigQuery,
  useUpdateSmsConfigStatusMutation,
  useUpdateTencentSmsConfigMutation,
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

const tencentSchema = z.object({
  sign: z.string().min(1, "Please enter SMS sign"),
  appId: z.string().min(1, "Please enter Tencent Cloud APP KEY"),
  accessKeyId: z.string().min(1, "Please enter Tencent Cloud Secret ID"),
  accessKeySecret: z.string().min(1, "Please enter Tencent Cloud Secret KEY"),
});

type TencentFormValues = z.infer<typeof tencentSchema>;

const TencentSms = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const tencentForm = useForm<TencentFormValues>({
    resolver: zodResolver(tencentSchema),
    defaultValues: {
      sign: "",
      appId: "",
      accessKeyId: "",
      accessKeySecret: "",
    },
  });

  const { data, isLoading, refetch } = useTencentSmsConfigQuery({});
  const updateStatusMutation = useUpdateSmsConfigStatusMutation("tencent", {
    onSuccess: (result: any) => {
      setEnabled(Boolean((result as any).enable));
      toast.success(t("notice.tencentSms.toast.enabled"));
      void queryClient.invalidateQueries({ queryKey: ["notice", "sms-config"] });
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || t("notice.tencentSms.toast.enableFailed"));
    },
  });
  const updateMutation = useUpdateTencentSmsConfigMutation({
    onSuccess: (result: any) => {
      toast.success(t("notice.tencentSms.toast.saved"));
      setEnabled(Boolean(result.enable));
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || t("notice.tencentSms.toast.saveFailed"));
    },
  });

  useEffect(() => {
    if (data) {
      const config = data as any;
      tencentForm.reset({
        sign: config.sign ?? "",
        appId: config.appId ?? "",
        accessKeyId: config.accessKeyId ?? "",
        accessKeySecret: config.accessKeySecret ?? "",
      });
      setEnabled(Boolean(config.enable));
    }
  }, [data, tencentForm]);

  /**
   * 提交保存腾讯云短信配置。
   */
  const onSubmit = async (values: TencentFormValues) => {
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
   * 启用腾讯云短信。
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
    <Form {...tencentForm}>
      <form onSubmit={tencentForm.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <MessageSquare className="text-primary size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t("notice.tencentSms.title")}</span>
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
                {enabled ? t("notice.tencentSms.enabled") : t("notice.tencentSms.enable")}
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>

        {/* 短信签名 */}
        <FormField
          control={tencentForm.control}
          name="sign"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>
                {t("notice.tencentSms.sign")}
              </FormLabel>
              <FormControl>
                <Input placeholder={t("notice.tencentSms.validation.signRequired")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={tencentForm.control}
          name="appId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>
                {t("notice.tencentSms.appId")}
              </FormLabel>
              <FormControl>
                <Input placeholder={t("notice.tencentSms.validation.appIdRequired")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={tencentForm.control}
          name="accessKeyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>
                {t("notice.tencentSms.secretId")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t("notice.tencentSms.validation.secretIdRequired")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={tencentForm.control}
          name="accessKeySecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-destructive">*</span>
                {t("notice.tencentSms.secretKey")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t("notice.tencentSms.validation.secretIdRequired")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <PermissionGuard permissions="notice:sms-config-update-tencent">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("notice.tencentSms.saveSettings")}
            </Button>
          </PermissionGuard>
          <PermissionGuard permissions="notice:sms-scene-settings-detail">
            <Button asChild type="button" variant="outline">
              <Link to="/console/notice/notification-settings">
                {t("notice.tencentSms.notificationSettings")}
              </Link>
            </Button>
          </PermissionGuard>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tencentForm.reset({
                sign: "",
                appId: "",
                accessKeyId: "",
                accessKeySecret: "",
              })
            }
          >
            {t("notice.tencentSms.resetSettings")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TencentSms;
