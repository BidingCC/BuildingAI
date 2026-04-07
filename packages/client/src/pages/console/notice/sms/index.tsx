import { useI18n } from "@buildingai/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { useMemo, useState } from "react";

import { PageContainer } from "@/layouts/console/_components/page-container";

import AliyunSms from "./_components/aliyunSms.tsx";
import TencentSms from "./_components/tencentSms.tsx";

const NoticeSmsPage = () => {
  const { t } = useI18n();
  const tabs = useMemo(
    () => [
      { name: "aliyun", labelKey: "notice.sms.aliyun" },
      { name: "tencent", labelKey: "notice.sms.tencent" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState("aliyun");
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <PageContainer>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.name} value={tab.name}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="aliyun" className="max-w-full md:max-w-md">
          <AliyunSms />
        </TabsContent>
        <TabsContent value="tencent" className="md:max-w-full lg:max-w-md">
          <TencentSms />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default NoticeSmsPage;
