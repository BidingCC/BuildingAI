import { useWebExtensionDetailQuery } from "@buildingai/services/web";
import { useConfigStore } from "@buildingai/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Puzzle } from "lucide-react";
import { Link } from "react-router-dom";

export interface ConsoleLogoProps {
  identifier?: string;
}

export function ConsoleLogo({ identifier }: ConsoleLogoProps) {
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { data: extension, isLoading } = useWebExtensionDetailQuery(identifier || "", {
    enabled: !!identifier,
  });

  if (isLoading && identifier) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Skeleton className="size-8 rounded-md" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link to="/console">
            <>
              <Avatar className="size-8 rounded-md after:hidden">
                <AvatarImage src={extension.icon} alt={extension.name} className="rounded-md" />
                <AvatarFallback className="rounded-md">
                  <Puzzle className="size-4" />
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-1 flex-col justify-center text-left text-sm">
                <span className="truncate font-medium">
                  {extension?.name || websiteConfig?.webinfo.name}
                </span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {extension?.description || "插件管理 · 工作台"}
                </span>
              </div>
            </>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
