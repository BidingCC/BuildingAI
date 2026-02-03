import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@buildingai/ui/components/ui/dialog";
import { ChevronRight, Crown } from "lucide-react";
import { useState } from "react";

import { SettingItem, SettingItemGroup } from "../setting-item";

const SubscribeSetting = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <SettingItemGroup>
        <SettingItem
          title={
            <div className="flex items-center gap-1">
              <Crown className="size-4" />
              顶级SVIP
            </div>
          }
          description="到期时间至 2099/01/22"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-muted-foreground/10"
            onClick={() => setOpen(true)}
          >
            <ChevronRight />
          </Button>
        </SettingItem>
      </SettingItemGroup>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>订阅详情</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span className="text-muted-foreground text-xs">计划名称</span>
              <span className="text-sm">顶级SVIP</span>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span className="text-muted-foreground text-xs">到期时间</span>
              <span className="text-sm">2099/01/22</span>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span className="text-muted-foreground text-xs">到期时间</span>
              <span className="text-sm">2099/01/22</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { SubscribeSetting };
