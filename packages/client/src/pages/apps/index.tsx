import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@buildingai/ui/components/ui/carousel";
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
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { ChevronRight, Search } from "lucide-react";

const AppsIndexPage = () => {
  return (
    <ScrollArea className="h-dvh" viewportClassName="[&_>div]:block!">
      <div className="flex w-full flex-col items-center">
        <div className="flex h-13 w-full items-center px-2">
          <SidebarTrigger className="md:hidden" />
        </div>

        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl">应用中心</h1>
              <p className="text-muted-foreground text-sm">
                在 BuildingAI 中与你喜爱的应用进行交互
              </p>
            </div>
            <div className="max-sm:w-full">
              <InputGroup className="rounded-full">
                <InputGroupInput placeholder="搜索应用" />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <Carousel className="bg-primary mt-8 w-full rounded-2xl sm:rounded-4xl">
            <CarouselContent>
              {Array.from({ length: 5 }).map((_, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-20/8 p-6">
                    <span className="text-5xl font-semibold">Banner{index + 1}</span>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

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
    </ScrollArea>
  );
};

export default AppsIndexPage;
