import { useRefreshUser, useRefreshWebsiteConfig } from "@buildingai/hooks";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  useRefreshWebsiteConfig();
  useRefreshUser();

  return (
    <>
      <Outlet />
    </>
  );
};

export default MainLayout;
