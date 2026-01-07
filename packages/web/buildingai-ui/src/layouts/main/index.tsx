import { useRefreshUser, useRefreshWebsiteConfig } from "@buildingai/hooks";
import { useInitializeStatus } from "@buildingai/services/shared";
import { Navigate, Outlet } from "react-router-dom";

const MainLayout = () => {
  const { data } = useInitializeStatus();
  useRefreshWebsiteConfig();
  useRefreshUser();

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
