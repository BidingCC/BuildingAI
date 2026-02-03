import type { Dataset } from "@buildingai/services/web";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { ChevronLeft, Edit } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MemberDialog } from "../dialogs/member-dialog";
import { PublishDialog } from "../dialogs/publish-dialog";
import { HeaderActions } from "./header-actions";

export interface ContentHeaderProps {
  dataset: Dataset | undefined;
  onDelete?: () => void;
}

export function ContentHeader({ dataset, onDelete }: ContentHeaderProps) {
  const navigate = useNavigate();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const title = dataset?.name ?? "";
  const avatar = dataset?.coverUrl ?? undefined;
  const creatorName = dataset?.creator?.nickname ?? dataset?.createdBy ?? "";
  const memberCount = dataset?.memberCount ?? 0;
  const isOwner = dataset?.isOwner ?? false;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 pl-2">
        {/* 左侧：返回按钮 + 基本信息 */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft />
          </Button>
          <DatasetInfo
            title={title}
            avatar={avatar}
            creatorName={creatorName}
            memberCount={memberCount}
            isOwner={isOwner}
          />
        </div>

        {/* 右侧：操作按钮 */}
        <HeaderActions
          isOwner={isOwner}
          dataset={
            dataset
              ? { name: title, coverUrl: avatar, description: dataset.description }
              : undefined
          }
          onMemberClick={() => setMemberDialogOpen(true)}
          onPublishClick={() => setPublishDialogOpen(true)}
          onDelete={onDelete}
        />
      </header>

      {/* 对话框 */}
      <MemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
      <PublishDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen} />
    </>
  );
}

// 数据集信息子组件
function DatasetInfo({
  title,
  avatar,
  creatorName,
  memberCount,
  isOwner,
}: {
  title: string;
  avatar?: string;
  creatorName: string;
  memberCount: number;
  isOwner: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-8 rounded-lg after:rounded-lg">
        <AvatarImage src={avatar} />
        <AvatarFallback className="rounded-lg">
          {(title || "库").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-sm">{title}</span>
          <Edit className="size-3" />
        </div>
        <span className="text-muted-foreground text-xs">
          {creatorName}创建 · {memberCount}人{isOwner ? "" : "已加入"}
        </span>
      </div>
    </div>
  );
}
