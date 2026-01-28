import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { Outlet } from "react-router-dom";

import { SettingsDialogProvider } from "@/components/settings-dialog";

import { DefaultAppSidebar } from "./_components/default-sidebar";

export default function DefaultLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SettingsDialogProvider>
      <SidebarProvider>
        <DefaultAppSidebar />
        <SidebarInset className="h-dvh overflow-x-hidden">{children || <Outlet />}</SidebarInset>
      </SidebarProvider>
    </SettingsDialogProvider>
  );
}
