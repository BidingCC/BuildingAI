import type { SquarePublishStatus } from "@buildingai/services/web";
import { useApplyToDataset, useDeleteDataset, useLeaveDatasets } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageCircle, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useChatPanel } from "../_layouts";
import { useDatasetDetailContext } from "../context";

function getPublishButtonLabel(
  squarePublishStatus: SquarePublishStatus | undefined,
  publishedToSquare: boolean | undefined,
): string {
  if (publishedToSquare || squarePublishStatus === "approved") return "取消发布";
  if (squarePublishStatus === "pending") return "审核中";
  if (squarePublishStatus === "rejected") return "审核未通过";
  return "发布到知识广场";
}

export function DatasetActions() {
  const { dataset, isOwner, dialog } = useDatasetDetailContext();
  const navigate = useNavigate();
  const { chatOpen, toggleChatPanel } = useChatPanel();
  const { confirm } = useAlertDialog();
  const queryClient = useQueryClient();

  const deleteMutation = useDeleteDataset(dataset?.id ?? "");
  const leaveMutation = useLeaveDatasets(dataset?.id ?? "");
  const applyMutation = useApplyToDataset(dataset?.id ?? "");

  const title = dataset?.name ?? "";
  const squarePublishStatus = dataset?.squarePublishStatus ?? "none";
  const publishedToSquare = dataset?.publishedToSquare;
  const publishLabel = getPublishButtonLabel(squarePublishStatus, publishedToSquare);
  const isPending = squarePublishStatus === "pending";

  const isMember = dataset?.isOwner || dataset?.isMember;
  const needApproval = dataset?.memberJoinApprovalRequired !== false;

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

  const handleLeave = useCallback(() => {
    if (!dataset?.id) return;
    leaveMutation.mutate(undefined, {
      onSuccess: () => navigate("/datasets"),
    });
  }, [dataset?.id, leaveMutation, navigate]);

  const handleApply = useCallback(() => {
    if (!dataset?.id) return;
    if (isMember) return;
    applyMutation.mutate(
      {},
      {
        onSuccess: () => {
          if (needApproval) {
            toast.success("已提交加入申请，等待创建者审核");
          } else {
            toast.success("已加入知识库");
          }
          queryClient.invalidateQueries({ queryKey: ["datasets", dataset.id] });
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "加入知识库失败";
          toast.error(message);
        },
      },
    );
  }, [dataset?.id, isMember, needApproval, applyMutation, queryClient]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={chatOpen ? "default" : "outline"}
        size="lg"
        onClick={toggleChatPanel}
        className="hidden md:inline-flex"
      >
        <MessageCircle className="size-4" />
        聊一聊
      </Button>
      {dataset && !isMember && (
        <Button
          variant="outline"
          size="lg"
          onClick={handleApply}
          disabled={applyMutation.isPending}
        >
          加入知识库
        </Button>
      )}
      {dataset && isMember && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="lg">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(publishLabel !== "取消发布" || isOwner) && (
              <DropdownMenuItem
                onClick={() => dialog.open({ type: "publish" })}
                disabled={isPending}
                className={
                  squarePublishStatus === "rejected"
                    ? "text-destructive focus:text-destructive"
                    : undefined
                }
              >
                <Share2 className="mr-2 size-4" />
                {publishLabel}
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  dialog.open({ type: "editDataset" });
                }}
              >
                <Pencil className="mr-2 size-4" />
                资料修改
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={isOwner ? handleDelete : handleLeave}
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
      )}
    </div>
  );
}
