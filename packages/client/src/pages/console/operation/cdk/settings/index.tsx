import { useI18n } from "@buildingai/i18n";
import { useCDKSettingsQuery, useUpdateCDKSettingsMutation } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

/**
 * 卡密设置页面
 */
export default function CDKSettings() {
  const { t } = useI18n();
  const [isEnabled, setIsEnabled] = useState(false);
  const [notice, setNotice] = useState("");

  const { data, isLoading } = useCDKSettingsQuery();
  const updateMutation = useUpdateCDKSettingsMutation();

  useEffect(() => {
    if (data) {
      setIsEnabled(data.enabled);
      setNotice(data.notice || "");
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        enabled: isEnabled,
        notice: notice.trim() || undefined,
      });
      toast.success(t("operation.cdk.settings.saved"));
    } catch (error: any) {
      toast.error(t("operation.cdk.settings.saveFailed"));
    }
  };

  return (
    <PageContainer>
      <div className="space-y-4 px-4">
        <div>
          <h1 className="text-lg font-semibold">{t("operation.cdk.settings.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("operation.cdk.settings.desc")}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-[14px] font-medium">{t("operation.cdk.settings.enableFeature")}</h2>
          <p className="text-muted-foreground text-sm">{t("operation.cdk.settings.enableDesc")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          <span className="text-sm">
            {isEnabled ? t("operation.cdk.settings.enabled") : t("operation.cdk.settings.disabled")}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-[14px] font-medium">
            {t("operation.cdk.settings.redemptionNotice")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("operation.cdk.settings.noticeDesc")}</p>
        </div>
        <Textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder={t("operation.cdk.settings.noticePlaceholder")}
          className="min-h-32 w-full resize-none md:w-md"
          rows={6}
        />

        <div className="flex justify-start">
          <Button onClick={handleSave} loading={updateMutation.isPending || isLoading}>
            {t("operation.cdk.settings.save")}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
