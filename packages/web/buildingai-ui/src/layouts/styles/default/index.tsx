import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { Outlet } from "react-router-dom";

import { DefaultAppSidebar } from "./_components/default-sidebar";

export default function DefaultLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DefaultAppSidebar />
      <SidebarInset className="h-dvh">{children || <Outlet />}</SidebarInset>
    </SidebarProvider>
  );
}
