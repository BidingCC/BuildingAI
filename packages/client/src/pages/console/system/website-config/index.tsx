import { useI18n } from "@buildingai/i18n";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { lazy, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Information = lazy(() => import("./_components/information"));
const Copyright = lazy(() => import("./_components/copyright"));
const Statistics = lazy(() => import("./_components/statistics"));
import { PageContainer } from "@/layouts/console/_components/page-container";

const SystemWebsiteConfigIndexPage = () => {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { name: "information", label: t("system.websiteConfig.tabs.information") },
      { name: "copyright", label: t("system.websiteConfig.tabs.copyright") },
      { name: "statistics", label: t("system.websiteConfig.tabs.statistics") },
    ],
    [t],
  );

  const currentTab = tabs.find((t) => t.name === searchParams[0].get("tab"))?.name || tabs[0].name;

  const handleChange = (value: string) => {
    navigate(`?tab=${value}`, { replace: true });
  };

  const CurrentComponent = useMemo(() => {
    switch (currentTab) {
      case "copyright":
        return Copyright;
      case "statistics":
        return Statistics;
      default:
        return Information;
    }
  }, [currentTab]);
  return (
    <PageContainer>
      <PermissionGuard permissions="system-website:getConfig">
        <Tabs value={currentTab} onValueChange={handleChange} className="space-y-4">
          <TabsList className="w-fit">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.name} value={tab.name}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={currentTab} className="md:max-w-full lg:max-w-md">
            <CurrentComponent />
          </TabsContent>
        </Tabs>
      </PermissionGuard>
    </PageContainer>
  );
};

export default SystemWebsiteConfigIndexPage;
