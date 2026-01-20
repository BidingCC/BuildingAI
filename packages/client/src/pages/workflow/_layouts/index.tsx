import { Avatar, AvatarFallback } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { ChevronLeft, Edit, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { WorkflowSidebar } from "./sidebar";

export default function WorkflowLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <SidebarProvider storageKey="__workflow_workspace_sidebar__">
      <WorkflowSidebar />
      <SidebarInset className="flex h-dvh flex-col overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 pl-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="size-8 rounded-lg after:rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <Workflow />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-sm">新的Workflow</span>
                  <Edit className="size-3" />
                </div>
                <span className="text-muted-foreground text-xs">保存于2026-01-14 17:59:00</span>
              </div>
            </div>
          </div>
        </header>
        <div className="relative flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
