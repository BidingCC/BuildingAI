import { useRefreshUser, useRefreshWebsiteConfig } from "@buildingai/hooks";
import { useCheckInitializeStatus } from "@buildingai/services/shared";
import { Navigate, Outlet } from "react-router-dom";

const MainLayout = () => {
  const { data } = useCheckInitializeStatus();
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
