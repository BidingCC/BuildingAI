import { useI18n } from "@buildingai/i18n";
import { useConfigStore } from "@buildingai/stores";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { Link } from "react-router-dom";

export function ConsoleLogo() {
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { t } = useI18n();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link to="/">
            <>
              {websiteConfig?.webinfo.logo ? (
                <Avatar className="h-8 rounded-md after:hidden">
                  <AvatarImage
                    className="rounded-md"
                    src={websiteConfig?.webinfo.logo}
                    alt={websiteConfig?.webinfo.name}
                  />
                  <AvatarFallback className="rounded-md">
                    {websiteConfig?.webinfo.name?.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <SvgIcons.buildingai className="size-8!" />
              )}
              <div className="flex flex-1 flex-col justify-center text-left text-sm">
                <span className="truncate font-medium">{websiteConfig?.webinfo.name}</span>
                <span className="truncate text-xs">
                  {t("common.workspace")} ·{" "}
                  <span className="text-muted-foreground">
                    v{websiteConfig?.webinfo.version || "26.0.0"}
                  </span>
                </span>
              </div>
            </>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
