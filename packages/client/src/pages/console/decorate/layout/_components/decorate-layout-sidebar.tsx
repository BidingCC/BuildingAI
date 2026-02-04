import { useConfigStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import { SidebarMenuButton } from "@buildingai/ui/components/ui/sidebar";
import { PanelLeftIcon } from "lucide-react";

import SvgIcons from "@/components/svg-icons";

export const DecorateLayoutSidebar = () => {
  const { websiteConfig } = useConfigStore((state) => state.config);
  return (
    <div className="bg-sidebar absolute top-px left-px h-[calc(100%-2px)] w-64 rounded-tl-lg rounded-bl-lg max-sm:w-[calc(100%-2px)] max-sm:rounded-lg">
      <div className="p-2">
        <SidebarMenuButton size="lg" asChild>
          <div className="relative flex items-center justify-between">
            <div>
              <>
                {websiteConfig?.webinfo.logo ? (
                  <img
                    className="h-8"
                    src={websiteConfig?.webinfo.logo}
                    alt={websiteConfig?.webinfo.name}
                  />
                ) : (
                  <SvgIcons.buildingai className="size-8!" />
                )}
              </>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-accent-foreground/5 absolute top-1/2 right-2 -translate-y-1/2"
            >
              <PanelLeftIcon />
            </Button>
          </div>
        </SidebarMenuButton>
      </div>
    </div>
  );
};
