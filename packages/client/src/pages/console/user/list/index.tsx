import { useCopy } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@buildingai/ui/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { Copy, EllipsisVertical, Plus } from "lucide-react";

const UserListIndexPage = () => {
  const { copy, isCopying } = useCopy();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input placeholder="搜索" />
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="blueberry">Blueberry</SelectItem>
              <SelectItem value="grapes">Grapes</SelectItem>
              <SelectItem value="pineapple">Pineapple</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
            <div className="flex items-center gap-3">
              <Button className="size-12 rounded-lg border-dashed" variant="outline">
                <Plus />
              </Button>
              <div className="flex flex-col">
                <span>创建用户</span>
                <span className="text-muted-foreground py-1 text-xs font-medium">添加新的用户</span>
              </div>
            </div>
          </div>

          {Array.from({ length: 15 }).map((_, index) => (
            <div
              key={index}
              className="group/provider-item relative flex flex-col gap-4 rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src="https://buildingai.fishblog.cn/static/ai/providers/moonshot.png"
                  alt="model.name"
                  className="aspect-square size-12 rounded-lg"
                />
                <div className="flex flex-col">
                  <span className="line-clamp-1">用户8jd92(9921hdk)</span>
                  <p className="text-muted-foreground group/user-number flex items-center text-xs">
                    1289738917389127
                    <Button
                      className="size-fit rounded-[4px] p-0.5 opacity-0 group-hover/user-number:opacity-100"
                      variant="ghost"
                      onClick={() => copy("1289738917389127")}
                      disabled={isCopying}
                    >
                      <Copy className="size-3" />
                    </Button>
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                      <EllipsisVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>编辑</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
                    <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                    正常
                  </Badge>
                  <Badge variant="secondary">角色</Badge>

                  <Switch className="ml-auto opacity-0 group-hover/provider-item:opacity-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background sticky bottom-0 flex py-2">
        <Pagination className="mx-0 w-fit">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

export default UserListIndexPage;
