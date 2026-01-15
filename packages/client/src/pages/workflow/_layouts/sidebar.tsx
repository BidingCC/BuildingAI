import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@buildingai/ui/components/ui/sidebar";
import { ExternalLink, FileText } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";

export function WorkflowSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="[&>div]:bg-background">
      <SidebarHeader className="flex flex-row items-center gap-1">
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>content</SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9" asChild>
              <Link to="/console/dashboard">
                <FileText />
                <span className="whitespace-nowrap">说明文档</span>
                <SidebarMenuAction asChild>
                  <div>
                    <ExternalLink />
                    <span className="sr-only">Toggle</span>
                  </div>
                </SidebarMenuAction>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
