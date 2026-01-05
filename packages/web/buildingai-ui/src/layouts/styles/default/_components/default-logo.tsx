import { useConfigStore } from "@buildingai/stores";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { Link } from "react-router-dom";

import SvgIcons from "@/components/svg-icons";

export function DefaultLogo() {
  const { websiteConfig } = useConfigStore((state) => state.config);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link to="/">
            <>
              {websiteConfig?.webinfo.logo ? (
                <img className="h-8" src={websiteConfig?.webinfo.logo} alt="logo" />
              ) : (
                <SvgIcons.buildingaiFull className="h-8" />
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{websiteConfig?.webinfo.name}</span>
              </div>
            </>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
