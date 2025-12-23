import { getWebsiteConfig } from "@buildingai/services/shared";
import { useConfigStore } from "@buildingai/stores";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  const { setWebsiteConfig } = useConfigStore((state) => state.configActions);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const websiteConfig = await getWebsiteConfig();
        setWebsiteConfig(websiteConfig);
      } catch (err) {
        console.error("获取网站配置失败", err);
      }
    };

    fetchConfig();
  }, []);

  return (
    <div>
      <Outlet />
    </div>
  );
};

export default MainLayout;
