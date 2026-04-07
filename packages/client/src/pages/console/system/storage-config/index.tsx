import { useI18n } from "@buildingai/i18n";
import { useStorageConfigListQuery } from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { lazy, useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/layouts/console/_components/page-container";

const Local = lazy(async () => import("./_components/local"));
const Oss = lazy(async () => import("./_components/oss"));

const SystemStorageConfigIndexPage = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("");
  const { data: configList } = useStorageConfigListQuery();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const tabs = useMemo(() => {
    const labelMap: Record<string, string> = {
      local: t("system.storageConfig.tabs.local"),
      oss: t("system.storageConfig.tabs.oss"),
      cos: t("system.storageConfig.tabs.cos"),
      kodo: t("system.storageConfig.tabs.kodo"),
    };
    return (
      configList?.map((item) => ({
        name: item.storageType,
        label: labelMap[item.storageType] ?? item.storageType,
      })) ?? []
    );
  }, [configList, t]);

  useEffect(() => {
    if (!configList || configList.length === 0) return;
    const active = configList.find((item) => item.isActive);
    const fallback = configList[0]?.storageType ?? "";
    const next = active?.storageType ?? fallback;

    setActiveTab((prev) =>
      prev && configList.some((item) => item.storageType === prev) ? prev : next,
    );
  }, [configList]);

  const activeConfigId = useMemo(
    () => configList?.find((item) => item.storageType === activeTab)?.id,
    [configList, activeTab],
  );

  const CurrentComponent = useMemo(() => {
    switch (activeTab) {
      case "oss":
        return Oss;
      default:
        return Local;
    }
  }, [activeTab]);

  return (
    <PageContainer>
      <PermissionGuard permissions="system-storage-config:list">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.name} value={tab.name}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeTab} className="md:max-w-full lg:max-w-md">
            <PermissionGuard permissions="system-storage-config:detail">
              <CurrentComponent configId={activeConfigId} />
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      </PermissionGuard>
    </PageContainer>
  );
};

export default SystemStorageConfigIndexPage;
