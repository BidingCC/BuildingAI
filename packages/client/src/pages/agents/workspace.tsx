import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@buildingai/ui/components/ui/item";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { Bot, ChevronRight, Plus, Search } from "lucide-react";

const AgentsWorkspacePage = () => {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex h-13 w-full items-center px-2">
        <SidebarTrigger className="md:hidden" />
      </div>

      <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl">我的智能体</h1>
            <p className="text-muted-foreground text-sm">管理我的智能体应用</p>
          </div>
          <div className="max-sm:w-full">
            <InputGroup className="rounded-full">
              <InputGroupInput placeholder="搜索智能体" />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            <Badge className="bg-primary text-primary-foreground h-9 px-4 font-medium text-nowrap sm:font-normal">
              全部
            </Badge>
            <Badge className="bg-accent text-accent-foreground h-9 px-4 font-medium text-nowrap sm:font-normal">
              已公开
            </Badge>
            <Badge className="bg-accent text-accent-foreground h-9 px-4 font-medium text-nowrap sm:font-normal">
              未公开
            </Badge>
          </div>
          <Button className="ml-auto rounded-full">
            <Plus />
            创建智能体
          </Button>
        </div>

        <div className="mt-6">
          <div className="grid gap-x-4 sm:grid-cols-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <Item
                key={index}
                className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding] hover:px-4"
              >
                <ItemMedia>
                  <Avatar className="size-10">
                    <AvatarImage src="https://github.com/evilrabbit.png3" />
                    <AvatarFallback>
                      <Bot />
                    </AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Evil Rabbit</ItemTitle>
                  <ItemDescription>Last seen 5 months ago</ItemDescription>
                </ItemContent>
                <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="rounded-full"
                    aria-label="Invite"
                  >
                    <ChevronRight />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsWorkspacePage;
