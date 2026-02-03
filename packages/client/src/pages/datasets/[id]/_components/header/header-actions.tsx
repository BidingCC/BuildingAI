import type { SquarePublishStatus } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { LogOut, MoreHorizontal, Pencil, Share2, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { DatasetEditDialog } from "../dialogs/dataset-edit-dialog";

function getPublishButtonLabel(
  squarePublishStatus: SquarePublishStatus | undefined,
  publishedToSquare: boolean | undefined,
): string {
  if (publishedToSquare || squarePublishStatus === "approved") return "取消发布";
  if (squarePublishStatus === "pending") return "审核中";
  if (squarePublishStatus === "rejected") return "审核未通过";
  return "发布到知识广场";
}

interface HeaderActionsProps {
  isOwner: boolean;
  dataset?: {
    name: string;
    coverUrl?: string;
    description?: string;
  };
  squarePublishStatus?: SquarePublishStatus;
  publishedToSquare?: boolean;
  onMemberClick?: () => void;
  onPublishClick?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}

export function HeaderActions({
  isOwner,
  dataset,
  squarePublishStatus = "none",
  publishedToSquare,
  onMemberClick,
  onPublishClick,
  onDelete,
  onLeave,
}: HeaderActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const publishLabel = getPublishButtonLabel(squarePublishStatus, publishedToSquare);
  const isPending = squarePublishStatus === "pending";

  const handleDeleteOrLeave = () => {
    if (isOwner) onDelete?.();
    else onLeave?.();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPublishClick}
        disabled={isPending}
        className={squarePublishStatus === "rejected" ? "text-destructive" : undefined}
      >
        <Share2 className="size-4" />
        {publishLabel}
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
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setEditDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 size-4" />
                资料修改
              </DropdownMenuItem>
              {editDialogOpen && (
                <DatasetEditDialog
                  mode="edit"
                  open
                  onOpenChange={setEditDialogOpen}
                  initialValues={{
                    name: dataset.name,
                    coverUrl: dataset.coverUrl,
                    description: dataset.description ?? "",
                  }}
                />
              )}
            </>
          )}
          <DropdownMenuItem
            onClick={handleDeleteOrLeave}
            className="text-destructive focus:text-destructive"
          >
            {isOwner ? (
              <>
                <Trash2 className="mr-2 size-4" />
                删除
              </>
            ) : (
              <>
                <LogOut className="mr-2 size-4" />
                退出仓库
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
