import type { DecorateMenuGroup } from "@buildingai/services/web";
import { type IconName, LucideIcon } from "@buildingai/ui/components/lucide-icon";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@buildingai/ui/components/ui/sidebar";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export function DefaultNavGroup({ group }: { group: DecorateMenuGroup }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {group.items
          .filter((item) => !item.isHidden)
          .map((item) => {
            const isExternal = item.link.target === "_blank";
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  className="group/group-item h-9 items-center group-data-[collapsible=icon]:p-1.5!"
                >
                  {isExternal ? (
                    <a href={item.link.path || ""} target="_blank" rel="noopener noreferrer">
                      {item.icon && <LucideIcon name={item.icon as IconName} />}
                      <span className="line-clamp-1">{item.title}</span>
                      <ExternalLink className="text-muted-foreground ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover/group-item:opacity-100" />
                    </a>
                  ) : (
                    <Link to={item.link.path || ""}>
                      {item.icon && <LucideIcon name={item.icon as IconName} />}
                      <span className="line-clamp-1">{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
