import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { Hammer, Settings2, Trash2 } from "lucide-react";

import { SettingItem } from "../setting-item";

const ToolsSetting = () => {
  return (
    <div className="bg-muted flex flex-col rounded-lg">
      <SettingItem
        contentClassName="gap-1"
        title="某某MCP"
        description={
          <div className="flex gap-2">
            <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
              <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
              连接正常
            </Badge>
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <Hammer />
              5个工具
            </Badge>
          </div>
        }
      >
        <div className="flex items-center">
          <Button
            size="icon-sm"
            className="hover:bg-destructive/15 dark:hover:bg-destructive/15 opacity-0 group-hover/setting-item:opacity-100"
            variant="ghost"
          >
            <Trash2 className="text-destructive" />
          </Button>

          <Button
            size="icon-sm"
            className="hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/15 mr-2"
            variant="ghost"
          >
            <Settings2 />
          </Button>
          <Switch id="airplane-mode" />
        </div>
      </SettingItem>
      <SettingItem
        contentClassName="gap-1"
        title="某某MCP"
        description={
          <div className="flex gap-2">
            <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
              <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
              连接正常
            </Badge>
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <Hammer />
              5个工具
            </Badge>
          </div>
        }
      >
        <div className="flex items-center">
          <Button
            size="icon-sm"
            className="hover:bg-destructive/15 dark:hover:bg-destructive/15 opacity-0 group-hover/setting-item:opacity-100"
            variant="ghost"
          >
            <Trash2 className="text-destructive" />
          </Button>

          <Button
            size="icon-sm"
            className="hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/15 mr-2"
            variant="ghost"
          >
            <Settings2 />
          </Button>
          <Switch id="airplane-mode" />
        </div>
      </SettingItem>
    </div>
  );
};

export { ToolsSetting };
