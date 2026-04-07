import { useI18n } from "@buildingai/i18n";
import {
  type SmsSceneSetting,
  useSmsSceneSettingsQuery,
  useUpdateSmsSceneSettingMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageContainer } from "@/layouts/console/_components/page-container";

const sceneSettingSchema = z.object({
  enable: z.boolean(),
  templateId: z.string().min(1, "Please enter template ID"),
  content: z.string().min(1, "Please enter SMS content"),
});

type SceneSettingFormValues = z.infer<typeof sceneSettingSchema>;

/**
 * 通知设置页面（短信场景）。
 */
const NoticeNotificationSettingsPage = () => {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<SmsSceneSetting | null>(null);

  const form = useForm<SceneSettingFormValues>({
    resolver: zodResolver(sceneSettingSchema),
    defaultValues: {
      enable: true,
      templateId: "",
      content: "",
    },
  });

  const { data, isLoading, refetch } = useSmsSceneSettingsQuery({});
  const rows = useMemo(() => data || [], [data]);

  const updateMutation = useUpdateSmsSceneSettingMutation(editingScene?.scene ?? 0, {
    onSuccess: () => {
      toast.success(t("notice.notificationSettings.toast.updated"));
      setDialogOpen(false);
      setEditingScene(null);
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || t("notice.notificationSettings.toast.updateFailed"));
    },
  });

  useEffect(() => {
    if (!editingScene) {
      return;
    }

    form.reset({
      enable: editingScene.smsEnabled,
      templateId: editingScene.smsTemplateId,
      content: editingScene.smsContent,
    });
  }, [editingScene, form]);

  /**
   * 打开场景配置弹窗。
   */
  const handleOpenSetting = (row: SmsSceneSetting) => {
    setEditingScene(row);
    setDialogOpen(true);
  };

  /**
   * 提交当前场景配置。
   */
  const onSubmit = async (values: SceneSettingFormValues) => {
    if (!editingScene) {
      return;
    }

    await updateMutation.mutateAsync({
      enable: values.enable,
      templateId: values.templateId,
      content: values.content,
    });
  };

  return (
    <PageContainer className="h-inset">
      <div className="space-y-4">
        <h2 className="text-base font-medium">{t("notice.notificationSettings.title")}</h2>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("notice.notificationSettings.table.scene")}</TableHead>
                <TableHead>{t("notice.notificationSettings.table.type")}</TableHead>
                <TableHead>{t("notice.notificationSettings.table.smsNotification")}</TableHead>
                <PermissionGuard permissions="notice:sms-scene-settings-update">
                  <TableHead className="w-[120px]">
                    {t("notice.notificationSettings.table.actions")}
                  </TableHead>
                </PermissionGuard>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center text-sm">
                    {t("notice.notificationSettings.table.loading")}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center text-sm">
                    {t("notice.notificationSettings.table.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.scene}>
                    <TableCell>{row.sceneName}</TableCell>
                    <TableCell>{row.noticeType}</TableCell>
                    <TableCell>
                      <Badge variant={row.smsEnabled ? "default" : "secondary"}>
                        {row.smsEnabled
                          ? t("notice.notificationSettings.status.enabled")
                          : t("notice.notificationSettings.status.disabled")}
                      </Badge>
                    </TableCell>
                    <PermissionGuard permissions="notice:sms-scene-settings-update">
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleOpenSetting(row)}>
                          {t("notice.notificationSettings.button.settings")}
                        </Button>
                      </TableCell>
                    </PermissionGuard>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("notice.notificationSettings.dialog.title")}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="enable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notice.notificationSettings.dialog.enableStatus")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <span className="text-sm">
                          {field.value
                            ? t("notice.notificationSettings.status.enabled")
                            : t("notice.notificationSettings.status.disabled")}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notice.notificationSettings.dialog.templateId")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("notice.notificationSettings.dialog.placeholder.templateId")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notice.notificationSettings.dialog.smsContent")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("notice.notificationSettings.dialog.placeholder.content")}
                        className="min-h-28"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-muted-foreground text-xs">
                      {t("notice.notificationSettings.dialog.hint.variables")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  {t("notice.notificationSettings.dialog.cancel")}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("notice.notificationSettings.dialog.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default NoticeNotificationSettingsPage;
