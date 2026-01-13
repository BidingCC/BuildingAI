import { useDocumentHead, useRefreshUser, useRefreshWebsiteConfig } from "@buildingai/hooks";
import { useCheckInitializeStatus } from "@buildingai/services/shared";
import { Navigate, Outlet } from "react-router-dom";

const MainLayout = () => {
  const { data } = useCheckInitializeStatus();
  const { websiteConfig } = useRefreshWebsiteConfig();

  useRefreshUser();

  useDocumentHead({
    title: websiteConfig?.webinfo.name,
    description: websiteConfig?.webinfo.description,
    icon: websiteConfig?.webinfo.icon,
  });

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
