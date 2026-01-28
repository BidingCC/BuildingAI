import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { ChevronsUpDown } from "lucide-react";

import { SettingItem } from "../setting-item";

const GeneralSetting = () => {
  return (
    <div className="bg-muted flex flex-col rounded-lg">
      <SettingItem title="这个设置" description="这个设置的介绍">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              这样那样
              <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>设置标题</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {}} className="flex items-center gap-2">
              设置项
              <DropdownMenuShortcut>
                <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SettingItem>
      <SettingItem title="这个设置" description="这个设置的介绍">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              这样那样
              <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>设置标题</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {}} className="flex items-center gap-2">
              设置项
              <DropdownMenuShortcut>
                <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SettingItem>
      <SettingItem title="这个设置" description="这个设置的介绍">
        <Switch id="airplane-mode" />
      </SettingItem>
    </div>
  );
};

export { GeneralSetting };
