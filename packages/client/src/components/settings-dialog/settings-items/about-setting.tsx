import { useSystemRuntimeInfoQuery } from "@buildingai/services/console";
import { useConfigStore } from "@buildingai/stores";
import { RootOnly } from "@buildingai/ui/components/auth/root-only";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Check, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AgreementDialog, type AgreementType } from "@/components/agreement-dialog";

import { SettingItem, SettingItemAction, SettingItemGroup } from "../setting-item";

const AboutSetting = () => {
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [customerServiceOpen, setCustomerServiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AgreementType>("service");
  const [copiedSystemId, setCopiedSystemId] = useState(false);
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { data: runtimeInfo, isLoading: runtimeInfoLoading } = useSystemRuntimeInfoQuery();
  const customerServiceQrcode = websiteConfig?.webinfo?.customerServiceQrcode;
  const systemId = runtimeInfo?.systemId?.trim();
  const version = runtimeInfo?.version || websiteConfig?.webinfo.version || "26.0.0";

  const handleCopySystemId = async () => {
    if (!systemId) return;

    try {
      await navigator.clipboard.writeText(systemId);
      setCopiedSystemId(true);
      toast.success("系统 ID 已复制");
      window.setTimeout(() => setCopiedSystemId(false), 1500);
    } catch {
      toast.error("系统 ID 复制失败");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <SettingItemGroup label="系统信息">
          <SettingItem title="系统版本" description={`v${version}`} />
          <RootOnly>
            <SettingItem
              title="系统 ID"
              description={
                <span className="font-mono break-all">
                  {systemId || (runtimeInfoLoading ? "加载中..." : "暂无")}
                </span>
              }
              contentClassName="min-w-0 flex-1 pr-3"
            >
              <SettingItemAction
                type="button"
                title="复制系统 ID"
                aria-label="复制系统 ID"
                disabled={!systemId}
                onClick={handleCopySystemId}
              >
                {copiedSystemId ? <Check /> : <Copy />}
              </SettingItemAction>
            </SettingItem>
          </RootOnly>
        </SettingItemGroup>

        <SettingItemGroup label="政策协议">
          <SettingItem title="用户协议">
            <SettingItemAction
              onClick={() => {
                setActiveTab("service");
                setAgreementOpen(true);
              }}
            >
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
          <SettingItem title="隐私政策">
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

        <SettingItemGroup label="联系我们">
          <SettingItem title="联系客服" onClick={() => setCustomerServiceOpen(true)}>
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
            <DialogTitle>联系客服</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-muted flex size-52 items-center justify-center overflow-hidden rounded-lg border">
              {customerServiceQrcode ? (
                <img
                  src={customerServiceQrcode}
                  alt="客服二维码"
                  className="size-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-sm">暂未配置二维码</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { AboutSetting };
