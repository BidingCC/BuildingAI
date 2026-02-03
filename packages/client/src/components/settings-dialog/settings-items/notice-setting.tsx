import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";

import { SettingItem, SettingItemGroup } from "../setting-item";

const NoticeSetting = () => {
  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup>
        <SettingItem title="站内信" description="站内信设置介绍">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                设置一
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="flex items-center gap-2">
                设置一
                <DropdownMenuShortcut>
                  <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>
      </SettingItemGroup>
    </div>
  );
};

export { NoticeSetting };
