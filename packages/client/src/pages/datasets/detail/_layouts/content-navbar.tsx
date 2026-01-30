import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { ChevronLeft, Edit, MoreHorizontal, Pencil, Share2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { DatasetEditDialog, type DatasetEditFormValues } from "../_components/dataset-edit-dialog";
import { MemberDialog } from "../_components/member-dialog";
import { PublishSquareDialog } from "../_components/publish-square-dialog";

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
  onEdit?: () => void;
  onEditSubmit?: (values: DatasetEditFormValues) => void;
  onDelete?: () => void;
}

export function ContentNavbar({
  mode,
  dataset,
  onEdit,
  onEditSubmit,
  onDelete,
}: ContentNavbarProps) {
  const navigate = useNavigate();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [publishSquareDialogOpen, setPublishSquareDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
        <Button variant="ghost" size="sm" onClick={() => setPublishSquareDialogOpen(true)}>
          <Share2 className="size-4" />
          发布到知识广场
        </Button>
        <PublishSquareDialog
          open={publishSquareDialogOpen}
          onOpenChange={setPublishSquareDialogOpen}
        />
        <Button variant="ghost" size="sm" onClick={() => setMemberDialogOpen(true)}>
          <Users className="size-4" />
          成员
        </Button>
        <MemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
        <DatasetEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          mode="edit"
          initialValues={{
            name: dataset.title,
            coverUrl: dataset.avatar,
            description: dataset.description ?? "",
          }}
          onSubmit={onEditSubmit}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onEdit?.();
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="mr-2 size-4" />
              资料修改
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
