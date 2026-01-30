import {
  useDocumentHead,
  useRefreshUser,
  useRefreshUserConfig,
  useRefreshWebsiteConfig,
} from "@buildingai/hooks";
import { useCheckInitializeStatus } from "@buildingai/services/shared";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const MainLayout = () => {
  const location = useLocation();
  const { data } = useCheckInitializeStatus();
  const { websiteConfig } = useRefreshWebsiteConfig();

  useRefreshUser();
  useRefreshUserConfig();

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
