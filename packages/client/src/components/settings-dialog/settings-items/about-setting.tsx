import { useI18n } from "@buildingai/i18n";
import { useConfigStore } from "@buildingai/stores";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { AgreementDialog, type AgreementType } from "@/components/agreement-dialog";

import { SettingItem, SettingItemAction, SettingItemGroup } from "../setting-item";

const AboutSetting = () => {
  const { t } = useI18n();
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [customerServiceOpen, setCustomerServiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AgreementType>("service");
  const { websiteConfig } = useConfigStore((state) => state.config);
  const customerServiceQrcode = websiteConfig?.webinfo?.customerServiceQrcode;

  return (
    <>
      <div className="flex flex-col gap-4">
        <SettingItemGroup label={t("settings.about.systemInfo")}>
          <SettingItem
            title={t("settings.about.systemVersion")}
            description={`v${websiteConfig?.webinfo.version || "26.0.0"}`}
          />
        </SettingItemGroup>

        <SettingItemGroup label={t("settings.about.policyAgreement")}>
          <SettingItem title={t("settings.about.userAgreement")}>
            <SettingItemAction
              onClick={() => {
                setActiveTab("service");
                setAgreementOpen(true);
              }}
            >
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
          <SettingItem title={t("settings.about.privacyPolicy")}>
            <SettingItemAction
              onClick={() => {
                setActiveTab("privacy");
                setAgreementOpen(true);
              }}
            >
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
        </SettingItemGroup>

        <SettingItemGroup label={t("settings.about.contactUs")}>
          <SettingItem title={t("settings.about.contactCustomerService")} onClick={() => setCustomerServiceOpen(true)}>
            <SettingItemAction>
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
        </SettingItemGroup>
      </div>

      <AgreementDialog open={agreementOpen} onOpenChange={setAgreementOpen} type={activeTab} />

      <Dialog open={customerServiceOpen} onOpenChange={setCustomerServiceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.about.contactCustomerService")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-muted flex size-52 items-center justify-center overflow-hidden rounded-lg border">
              {customerServiceQrcode ? (
                <img
                  src={customerServiceQrcode}
                  alt={t("settings.about.customerServiceQrcode")}
                  className="size-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-sm">{t("settings.about.qrcodeNotConfigured")}</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { AboutSetting };
