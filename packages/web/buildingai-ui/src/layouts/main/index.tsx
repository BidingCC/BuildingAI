import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  useEffect(() => {
    // document class="theme-indigo"
    document.body.className = "";
    document.body.classList.add("theme-indigo");
  });
  return (
    <div>
      <Outlet />
    </div>
  );
};

export default MainLayout;
