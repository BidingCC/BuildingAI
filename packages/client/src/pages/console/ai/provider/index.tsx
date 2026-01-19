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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { ChevronRight, EllipsisVertical, FileJson2, Plus } from "lucide-react";

const AiProviderIndexPage = () => {
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
              <span>新增厂商</span>
              <span className="text-muted-foreground py-1 text-xs font-medium">
                添加新的自定义模型厂商
              </span>
            </div>
          </div>

          <div className="mt-auto flex gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              <FileJson2 /> 从配置文件导入
            </Button>
            <Button size="xs" className="flex-1" variant="outline">
              <Plus /> 手动创建
            </Button>
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
                <span>OpenAI</span>
                <Button variant="ghost" size="xs" className="text-muted-foreground px-0 hover:px-2">
                  28个模型
                  <ChevronRight />
                </Button>
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
                <Badge variant="secondary">LLM</Badge>
                <Badge variant="secondary">TEXT EMBEDDING</Badge>
                <Badge variant="secondary">RERANK</Badge>
                <Badge variant="secondary">SPEECH2TEXT</Badge>
                <Badge variant="secondary">TTS</Badge>
                <Switch className="ml-auto opacity-0 group-hover/provider-item:opacity-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiProviderIndexPage;
