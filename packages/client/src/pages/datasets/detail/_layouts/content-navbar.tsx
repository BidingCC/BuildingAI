import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { ChevronLeft, Edit, MoreHorizontal, Share2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface DatasetInfo {
  id: string;
  title: string;
  avatar?: string;
  creator: string;
  memberCount: number;
  description?: string;
  contentCount?: number;
  totalSize?: string;
}

export interface ContentNavbarProps {
  mode: "own" | "others";
  dataset: DatasetInfo;
}

export function ContentNavbar({ mode, dataset }: ContentNavbarProps) {
  const navigate = useNavigate();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 pl-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="size-8 rounded-lg after:rounded-lg">
            <AvatarImage src={dataset.avatar} />
            <AvatarFallback className="rounded-lg">
              {dataset.title.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm">{dataset.title}</span>
              <Edit className="size-3" />
            </div>
            <span className="text-muted-foreground text-xs">
              {dataset.creator}创建 · {dataset.memberCount}人{mode === "own" ? "" : "已加入"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm">
          <Share2 className="size-4" />
          发布到知识广场
        </Button>
        <Button variant="ghost" size="sm">
          <Users className="size-4" />
          成员
        </Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    </header>
  );
}
