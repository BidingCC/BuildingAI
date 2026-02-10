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
import { ChevronRight, Search } from "lucide-react";

const KnowledgeIndexPage = () => {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-14 md:px-6 md:pt-16 lg:pt-18 xl:pt-24">
        <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl">知识库广场</h1>
            <p className="text-muted-foreground text-sm">加入你喜爱的知识库进行交互</p>
          </div>
          <div className="max-sm:w-full">
            <InputGroup className="rounded-full">
              <InputGroupInput placeholder="搜索知识库" />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        <div className="no-scrollbar mt-8 flex flex-nowrap gap-2 overflow-x-auto sm:px-3">
          <Badge className="bg-accent text-accent-foreground h-9 px-4 font-medium text-nowrap sm:font-normal">
            精选
          </Badge>
          <Badge className="bg-accent text-accent-foreground h-9 px-4 font-medium text-nowrap sm:font-normal">
            全部
          </Badge>
          {Array.from({ length: 5 }).map((_, index) => (
            <Badge
              className="bg-accent text-accent-foreground h-9 px-4 font-medium text-nowrap sm:font-normal"
              key={index}
            >
              标签{index + 1}
            </Badge>
          ))}
        </div>

        <div className="mt-6 sm:px-3">
          <div className="grid gap-x-4 sm:grid-cols-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <Item
                key={index}
                className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding] hover:px-4"
              >
                <ItemMedia>
                  <Avatar className="size-10">
                    <AvatarImage src="https://github.com/evilrabbit.png" />
                    <AvatarFallback>ER</AvatarFallback>
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

export default KnowledgeIndexPage;
