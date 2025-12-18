import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { Outlet } from "react-router-dom";

import AppNavbar from "./_components/app-navbar";
import { AppSidebar } from "./_components/app-sidebar";

export default function ConsoleLayout() {
  return (
    <SidebarProvider className="h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppNavbar />
        <ScrollArea className="flex-1 overflow-y-auto p-4 pt-0">
          <Outlet />
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
