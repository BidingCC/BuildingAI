import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Share2, Trash2, Users } from "lucide-react";

import { DatasetEditDialog } from "../dialogs/dataset-edit-dialog";

interface HeaderActionsProps {
  isOwner: boolean;
  dataset?: {
    name: string;
    coverUrl?: string;
    description?: string;
  };
  onMemberClick?: () => void;
  onPublishClick?: () => void;
  onDelete?: () => void;
}

export function HeaderActions({
  isOwner,
  dataset,
  onMemberClick,
  onPublishClick,
  onDelete,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={onPublishClick}>
        <Share2 className="size-4" />
        发布到知识广场
      </Button>

      <Button variant="ghost" size="sm" onClick={onMemberClick}>
        <Users className="size-4" />
        成员
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwner && dataset && (
            <DatasetEditDialog
              mode="edit"
              initialValues={{
                name: dataset.name,
                coverUrl: dataset.coverUrl,
                description: dataset.description ?? "",
              }}
            >
              <DropdownMenuItem>
                <Pencil className="mr-2 size-4" />
                资料修改
              </DropdownMenuItem>
            </DatasetEditDialog>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 size-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
