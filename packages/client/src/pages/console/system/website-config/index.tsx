import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { lazy, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Information = lazy(() => import("./_components/information"));
const Copyright = lazy(() => import("./_components/copyright"));
const Statistics = lazy(() => import("./_components/statistics"));
import { PageContainer } from "@/layouts/console/_components/page-container";

const SystemWebsiteConfigIndexPage = () => {
  const searchParams = useSearchParams();
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { name: "information", label: "网站信息" },
      { name: "copyright", label: "版权信息" },
      { name: "statistics", label: "站点统计" },
    ],
    [],
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
    </PageContainer>
  );
};

export default SystemWebsiteConfigIndexPage;
