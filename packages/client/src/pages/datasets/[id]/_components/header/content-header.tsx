import type { Dataset } from "@buildingai/services/web";
import {
  useDeleteDataset,
  useLeaveDatasets,
  usePublishDatasetToSquare,
  useUnpublishDatasetFromSquare,
} from "@buildingai/services/web";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { ChevronLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { MemberDialog } from "../dialogs/member-dialog";
import { PublishDialog } from "../dialogs/publish-dialog";
import { HeaderActions } from "./header-actions";

export interface ContentHeaderProps {
  dataset: Dataset | undefined;
}

export function ContentHeader({ dataset }: ContentHeaderProps) {
  const navigate = useNavigate();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const leaveMutation = useLeaveDatasets(dataset?.id ?? "");
  const deleteMutation = useDeleteDataset(dataset?.id ?? "");
  const publishMutation = usePublishDatasetToSquare(dataset?.id ?? "");
  const unpublishMutation = useUnpublishDatasetFromSquare(dataset?.id ?? "");
  const { confirm } = useAlertDialog();
  const title = dataset?.name ?? "";
  const avatar = dataset?.coverUrl ?? undefined;
  const creatorName = dataset?.creator?.nickname ?? dataset?.createdBy ?? "";
  const memberCount = dataset?.memberCount ?? 0;
  const isOwner = dataset?.isOwner ?? false;

  const handleDelete = useCallback(async () => {
    if (!dataset?.id || !isOwner) return;
    try {
      await confirm({
        title: "确认删除",
        description: `确定要删除知识库「${title}」吗？此操作不可撤销，将同时删除其中的所有文档与对话记录。`,
        confirmText: "删除",
        confirmVariant: "destructive",
      });
    } catch {
      return;
    }
    deleteMutation.mutate(undefined, {
      onSuccess: () => navigate("/datasets"),
    });
  }, [dataset?.id, isOwner, title, confirm, deleteMutation, navigate]);

  const handleLeave = () => {
    if (!dataset?.id) return;
    leaveMutation.mutate(undefined, {
      onSuccess: () => navigate("/datasets"),
    });
  };

  const handlePublishConfirm = useCallback(
    (publishToSquare: boolean) => {
      if (!dataset?.id) return;
      if (publishToSquare) {
        publishMutation.mutate(undefined, {
          onSuccess: () => {
            setPublishDialogOpen(false);
            toast.success("已提交审核，请等待审核结果");
            if (dataset?.id) {
              queryClient.refetchQueries({ queryKey: ["datasets", dataset.id] });
            }
          },
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : "发布失败");
          },
        });
      } else {
        unpublishMutation.mutate(undefined, {
          onSuccess: () => {
            setPublishDialogOpen(false);
            toast.success("已从知识广场取消发布");
            if (dataset?.id) {
              queryClient.refetchQueries({ queryKey: ["datasets", dataset.id] });
            }
          },
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : "取消发布失败");
          },
        });
      }
    },
    [dataset?.id, publishMutation, unpublishMutation, queryClient],
  );

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 pl-2">
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

        <HeaderActions
          isOwner={isOwner}
          dataset={
            dataset
              ? { name: title, coverUrl: avatar, description: dataset.description ?? undefined }
              : undefined
          }
          squarePublishStatus={dataset?.squarePublishStatus ?? "none"}
          publishedToSquare={dataset?.publishedToSquare}
          onMemberClick={() => setMemberDialogOpen(true)}
          onPublishClick={() => setPublishDialogOpen(true)}
          onDelete={handleDelete}
          onLeave={handleLeave}
        />
      </header>

      {memberDialogOpen && dataset?.id && (
        <MemberDialog
          datasetId={dataset.id}
          isOwner={dataset.isOwner}
          open
          onOpenChange={setMemberDialogOpen}
        />
      )}
      {publishDialogOpen && (
        <PublishDialog
          open
          onOpenChange={setPublishDialogOpen}
          defaultPublishedToSquare={Boolean(
            dataset?.publishedToSquare || dataset?.squarePublishStatus === "rejected",
          )}
          squarePublishStatus={dataset?.squarePublishStatus ?? "none"}
          squareRejectReason={dataset?.squareRejectReason ?? null}
          loading={publishMutation.isPending || unpublishMutation.isPending}
          onConfirm={handlePublishConfirm}
        />
      )}
    </>
  );
}

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
          {/* <Edit className="size-3" /> */}
        </div>
        <span className="text-muted-foreground text-xs">
          {creatorName}创建 · {memberCount}人{isOwner ? "" : "已加入"}
        </span>
      </div>
    </div>
  );
}
