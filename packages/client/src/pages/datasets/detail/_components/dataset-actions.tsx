import { useI18n } from "@buildingai/i18n";
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
  t: (key: string) => string,
  squarePublishStatus: SquarePublishStatus | undefined,
  publishedToSquare: boolean | undefined,
): string {
  if (publishedToSquare || squarePublishStatus === "approved")
    return t("dataset.detail.cancelPublish");
  if (squarePublishStatus === "pending") return t("dataset.detail.underReview");
  if (squarePublishStatus === "rejected") return t("dataset.detail.reviewRejected");
  return t("dataset.detail.publish");
}

export function DatasetActions() {
  const { t } = useI18n();
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
  const publishLabel = getPublishButtonLabel(t, squarePublishStatus, publishedToSquare);
  const isPending = squarePublishStatus === "pending";

  const isMember = dataset?.isOwner || dataset?.isMember;
  const needApproval = dataset?.memberJoinApprovalRequired !== false;

  const handleDelete = useCallback(async () => {
    if (!dataset?.id || !isOwner) return;
    try {
      await confirm({
        title: t("dataset.detail.confirmDeleteTitle"),
        description: t("dataset.detail.confirmDeleteDesc", { title }),
        confirmText: t("dataset.detail.delete"),
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
            toast.success(t("dataset.detail.joinRequestSubmitted"));
          } else {
            toast.success(t("dataset.detail.joinedDataset"));
          }
          queryClient.invalidateQueries({ queryKey: ["datasets", dataset.id] });
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : t("dataset.detail.joinFailed", { message: "" });
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
        {t("dataset.detail.chatWithIt")}
      </Button>
      {dataset && !isMember && (
        <Button
          variant="outline"
          size="lg"
          onClick={handleApply}
          disabled={applyMutation.isPending}
        >
          {t("dataset.detail.joinDataset")}
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
            {(publishLabel !== t("dataset.detail.cancelPublish") || isOwner) && (
              <DropdownMenuItem
                onClick={() => dialog.open({ type: "publish" })}
                disabled={isPending}
                className={
                  squarePublishStatus === "rejected"
                    ? "text-destructive focus:text-destructive"
                    : undefined
                }
              >
                <Share2 className="size-4" />
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
                <Pencil className="size-4" />
                {t("dataset.detail.edit")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={isOwner ? handleDelete : handleLeave}
              className="text-destructive focus:text-destructive"
            >
              {isOwner ? (
                <>
                  <Trash2 className="size-4" />
                  {t("dataset.detail.delete")}
                </>
              ) : (
                <>
                  <LogOut className="size-4" />
                  {t("dataset.detail.leaveDataset")}
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
