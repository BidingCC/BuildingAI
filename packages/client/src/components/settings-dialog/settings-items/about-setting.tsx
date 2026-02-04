import { useAgreementConfigQuery } from "@buildingai/services/web";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { SettingItem, SettingItemAction, SettingItemGroup } from "../setting-item";

const AboutSetting = () => {
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"service" | "privacy">("service");
  const { data, isLoading } = useAgreementConfigQuery();

  const agreement = data?.agreement;
  const serviceTitle = agreement?.serviceTitle || "用户协议";
  const serviceContent = agreement?.serviceContent || "";
  const privacyTitle = agreement?.privacyTitle || "隐私政策";
  const privacyContent = agreement?.privacyContent || "";

  const isService = activeTab === "service";
  const currentTitle = isService ? serviceTitle : privacyTitle;
  const currentContent = isService ? serviceContent : privacyContent;

  return (
    <>
      <div className="flex flex-col gap-4">
        <SettingItemGroup label="系统信息">
          <SettingItem title="系统版本" description="v26.0.0" />
        </SettingItemGroup>

        <SettingItemGroup label="政策协议">
          <SettingItem title="用户协议" onClick={() => setAgreementOpen(true)}>
            <SettingItemAction>
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
          <SettingItem
            title="隐私政策"
            onClick={() => {
              setActiveTab("privacy");
              setAgreementOpen(true);
            }}
          >
            <SettingItemAction>
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
        </SettingItemGroup>

        <SettingItemGroup label="联系我们">
          <SettingItem title="联系客服">
            <SettingItemAction>
              <ChevronRight />
            </SettingItemAction>
          </SettingItem>
        </SettingItemGroup>
      </div>

      <Dialog open={agreementOpen} onOpenChange={setAgreementOpen}>
        <DialogContent className="m-0 flex h-screen max-h-screen w-screen max-w-full! flex-col rounded-none p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>用户协议</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-full px-4 py-4 sm:px-6 sm:py-5">
            <div className="prose dark:prose-invert mx-auto max-w-prose">
              {isLoading && (
                <p className="text-muted-foreground text-xs sm:text-sm">正在加载协议内容…</p>
              )}
              <div className="flex items-center justify-center pt-12 pb-6 text-lg font-medium">
                <h2 className="text-3xl font-normal">{currentTitle}</h2>
              </div>

              {!isLoading && currentContent && (
                <div
                  className="prose prose-neutral dark:prose-invert prose-pre:bg-primary/15 prose-pre:text-foreground w-full max-w-full"
                  // 协议内容来自后台配置，允许基础 HTML
                  dangerouslySetInnerHTML={{ __html: currentContent }}
                />
              )}

              {!isLoading && !currentContent && (
                <p className="text-muted-foreground text-xs sm:text-sm">
                  暂未配置{isService ? "用户协议" : "隐私政策"}内容，请联系管理员在网站配置中补充。
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { AboutSetting };
