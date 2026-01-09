import { useConfigStore } from "@buildingai/stores";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

import SvgIcons from "@/components/svg-icons";

export function DefaultLogo() {
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex">
        <SidebarMenuButton size="lg" asChild>
          <div>
            <div className="group/default-logo-button relative flex items-center justify-between">
              <SidebarTrigger
                className={cn("absolute inset-0 z-2 hidden opacity-0 transition-opacity md:flex", {
                  "flex md:group-hover/default-logo-button:opacity-100": state === "collapsed",
                  hidden: state === "expanded",
                })}
              />
              <Link
                to="/"
                className={cn("transition-opacity duration-200", {
                  "relative z-1 md:group-hover/default-logo-button:opacity-0":
                    state === "collapsed",
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
            {state === "expanded" && (
              <SidebarTrigger className="hover:bg-accent-foreground/5 absolute top-1/2 right-2 -translate-y-1/2" />
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
