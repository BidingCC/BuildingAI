import { useConfigStore } from "@buildingai/stores";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { Link } from "react-router-dom";

import SvgIcons from "@/components/svg-icons";

export function DefaultLogo() {
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton className="group/menu-item" size="lg" asChild>
          <div className="relative">
            <SidebarTrigger
              className={cn("absolute inset-0 z-2 opacity-0 transition-opacity duration-200", {
                "flex group-hover/menu-item:opacity-100": state === "collapsed",
                hidden: state === "expanded",
              })}
            />
            <Link
              to="/"
              className={cn("transition-opacity duration-200", {
                "group-hover/menu-item:opacity-0": state === "collapsed",
              })}
            >
              <>
                {websiteConfig?.webinfo.logo ? (
                  <img
                    className="h-8"
                    src={websiteConfig?.webinfo.logo}
                    alt={websiteConfig?.webinfo.name}
                  />
                ) : (
                  <SvgIcons.buildingaiFull className="h-8" />
                )}
              </>
            </Link>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
