import {
  useDocumentHead,
  useRefreshUser,
  useRefreshUserConfig,
  useRefreshWebsiteConfig,
} from "@buildingai/hooks";
import { useCheckInitializeStatus } from "@buildingai/services/shared";
import { useUserConfigStore } from "@buildingai/stores";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const MainLayout = () => {
  const location = useLocation();
  const { data } = useCheckInitializeStatus();
  const { websiteConfig } = useRefreshWebsiteConfig();
  const { initAppearance } = useUserConfigStore((s) => s.userConfigActions);

  useRefreshUser();
  useRefreshUserConfig();

  useEffect(() => {
    initAppearance();
  }, [initAppearance]);

  useDocumentHead({
    title: websiteConfig?.webinfo.name,
    description: websiteConfig?.webinfo.description,
    icon: websiteConfig?.webinfo.icon,
  });

  if (location.pathname === "/install") {
    return <Outlet />;
  }

  if (data?.isInitialized === false) {
    return <Navigate to="/install" />;
  }

  return (
    <>
      <Outlet />
    </>
  );
};

export default MainLayout;
