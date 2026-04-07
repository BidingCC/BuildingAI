import { useI18n } from "@buildingai/i18n";
import { type SquarePublishStatus, useWebAgentConfigQuery } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useEffect, useRef, useState } from "react";

import { TagSelect } from "@/components/tags";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPublishedToSquare?: boolean;
  defaultTagIds?: string[];
  squarePublishStatus?: SquarePublishStatus;
  squareRejectReason?: string | null;
  loading?: boolean;
  onConfirm?: (publishToSquare: boolean, tagIds?: string[]) => void;
}

const statusLabelMap: Record<string, string> = {
  none: "notSubmitted",
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

export function PublishDialog({
  open,
  onOpenChange,
  defaultPublishedToSquare = false,
  defaultTagIds,
  squarePublishStatus = "none",
  squareRejectReason,
  loading = false,
  onConfirm,
}: PublishDialogProps) {
  const { t } = useI18n();
  const configQuery = useWebAgentConfigQuery({ enabled: open } as any);
  const skipReview = configQuery.data?.publishWithoutReview === true;
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [publishToSquare, setPublishToSquare] = useState(defaultPublishedToSquare);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const initialPublishedToSquareRef = useRef(defaultPublishedToSquare);

  useEffect(() => {
    if (open) {
      const initial = defaultPublishedToSquare;
      initialPublishedToSquareRef.current = initial;
      setPublishToSquare(initial);
      setSelectedTagIds(defaultTagIds ?? []);
    }
  }, [open, defaultPublishedToSquare, defaultTagIds]);

  const squareStatus = squarePublishStatus ?? "none";
  const isPending = squareStatus === "pending";
  const isRejected = squareStatus === "rejected";
  const canSubmit = true;
  const canResubmit = true;

  const handleConfirm = () => {
    const initial = initialPublishedToSquareRef.current;
    if (publishToSquare === initial) {
      onOpenChange(false);
      return;
    }
    if (!canSubmit) return;
    onConfirm?.(publishToSquare, publishToSquare ? selectedTagIds : undefined);
  };

  const handleResubmit = () => {
    if (!canResubmit) return;
    onConfirm?.(true, selectedTagIds);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="gap-0 p-0 sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{t("agent.detail.publishDialog.title")}</DialogTitle>
          </DialogHeader>

          <div className="bg-muted/50 mx-4 mt-8 space-y-3 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {t("agent.detail.publishDialog.publishToSquare")}
                  </p>
                  <span className="text-muted-foreground text-xs">
                    {t(`agent.detail.publishDialog.${statusLabelMap[squareStatus]}`) ??
                      squareStatus}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {skipReview
                    ? t("agent.detail.publishDialog.skipReviewNote")
                    : t("agent.detail.publishDialog.needReviewNote")}
                </p>
              </div>
              <Switch
                checked={publishToSquare}
                onCheckedChange={setPublishToSquare}
                className="shrink-0"
                disabled={isPending}
              />
            </div>

            {publishToSquare && !isPending && (
              <div className="flex justify-between space-y-2 pt-2">
                <Label className="text-sm font-medium">
                  {t("agent.detail.publishDialog.category")}{" "}
                  <span className="text-muted-foreground text-xs">
                    {t("agent.detail.publishDialog.categoryOptional")}
                  </span>
                </Label>
                <TagSelect
                  tagsSource="web"
                  type="app"
                  showManage={false}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                  placeholder={t("agent.detail.publishDialog.searchCategory")}
                />
              </div>
            )}

            {isPending && (
              <p className="text-muted-foreground text-xs">
                {t("agent.detail.publishDialog.pendingNote")}
              </p>
            )}

            {isRejected && (
              <div className="space-y-1">
                <p className="text-destructive text-xs">
                  {t("agent.detail.publishDialog.rejectedNote")}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive h-auto p-0 text-xs"
                  onClick={() => setReasonDialogOpen(true)}
                >
                  {t("agent.detail.publishDialog.viewRejectionReason")}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-4 pt-6 pb-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {isPending ? t("common.close") : t("common.cancel")}
            </Button>
            {isRejected ? (
              <Button onClick={handleResubmit} disabled={loading || !canResubmit}>
                {loading
                  ? t("agent.detail.publishDialog.submitting")
                  : t("agent.detail.publishDialog.resubmit")}
              </Button>
            ) : !isPending ? (
              <Button onClick={handleConfirm} disabled={loading || !canSubmit}>
                {loading ? t("agent.detail.publishDialog.submitting") : t("common.confirm")}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("agent.detail.publishDialog.rejectionReason")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-[60px] py-2">
            <p className="text-muted-foreground text-sm">
              {squareRejectReason?.trim()
                ? squareRejectReason
                : t("agent.detail.publishDialog.noRejectionReason")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
              {t("agent.detail.publishDialog.gotIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
