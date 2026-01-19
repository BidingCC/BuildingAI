import { useExtensionsListQuery } from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { IconPuzzle } from "@tabler/icons-react";
import {
  CircleFadingArrowUp,
  EllipsisVertical,
  ExternalLink,
  FileText,
  Info,
  Plus,
  Settings,
  Trash2,
  User,
} from "lucide-react";

const ExtensionIndexPage = () => {
  const { data } = useExtensionsListQuery();

  return (
    <div className="flex flex-col gap-4">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
          <div className="flex items-center gap-3">
            <Button className="size-12 rounded-lg border-dashed" variant="outline">
              <Plus />
            </Button>
            <div className="flex flex-col">
              <span>安装应用</span>
              <span className="text-muted-foreground py-1 text-xs font-medium">
                使用激活码安装应用到本地
              </span>
            </div>
          </div>

          <div className="mt-auto flex gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              应用市场获取
              <ExternalLink />
            </Button>
            <Button size="xs" className="flex-1" variant="outline">
              <Plus /> 本地创建
            </Button>
          </div>
        </div>

        {data?.items.map((item, index) => (
          <div key={index} className="relative flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 after:rounded-lg">
                <AvatarImage src={item.icon} alt={item.name} className="rounded-lg" />
                <AvatarFallback className="size-12 rounded-lg">
                  <IconPuzzle />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div>{item.name}</div>
                <p className="text-muted-foreground line-clamp-1 text-xs">{item.description}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Info />
                    详情
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText />
                    更新日志
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash2 />
                    卸载
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">v1.0.0</Badge>
                <Badge variant="secondary">Web端</Badge>
                <Badge variant="secondary">移动端</Badge>
                {/* <Switch className="ml-auto opacity-0 group-hover/provider-item:opacity-100" /> */}
              </div>
            </div>

            <div className="mt-2 flex items-end justify-between">
              <div className="flex items-center gap-1.5">
                <Avatar className="size-5">
                  <AvatarImage />
                  <AvatarFallback>
                    <User className="size-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">用户isd92</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="outline">
                  <Settings />
                  管理
                </Button>
                <Button size="xs">
                  <CircleFadingArrowUp />
                  升级
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtensionIndexPage;
