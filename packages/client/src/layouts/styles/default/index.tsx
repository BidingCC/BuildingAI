import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { Outlet } from "react-router-dom";

import { DefaultAppSidebar } from "./_components/default-sidebar";

export default function DefaultLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider storageKey="layout-style-default-sidebar">
      <DefaultAppSidebar />
      <SidebarInset className="h-dvh overflow-x-hidden">{children || <Outlet />}</SidebarInset>
    </SidebarProvider>
  );
}
