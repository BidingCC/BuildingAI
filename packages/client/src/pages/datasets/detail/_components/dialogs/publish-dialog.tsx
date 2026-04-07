import { useI18n } from "@buildingai/i18n";
import {
  type SquarePublishStatus,
  useDatasetsSquarePublishConfigQuery,
} from "@buildingai/services/web";
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

export interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPublishedToSquare?: boolean;
  defaultTagIds?: string[];
  squarePublishStatus?: SquarePublishStatus;
  squareRejectReason?: string | null;
  loading?: boolean;
  onConfirm?: (
    publishToSquare: boolean,
    tagIds?: string[],
    memberJoinApprovalRequired?: boolean,
  ) => void;
  defaultMemberJoinApprovalRequired?: boolean;
}

export function PublishDialog({
  open,
  onOpenChange,
  defaultPublishedToSquare = false,
  defaultTagIds,
  squarePublishStatus = "none",
  squareRejectReason,
  loading = false,
  onConfirm,
  defaultMemberJoinApprovalRequired = true,
}: PublishDialogProps) {
  const { t } = useI18n();
  const configQuery = useDatasetsSquarePublishConfigQuery({ enabled: open });
  const skipReview = configQuery.data?.squarePublishSkipReview === true;
  const [publishToSquare, setPublishToSquare] = useState(defaultPublishedToSquare);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaultTagIds ?? []);
  const [memberJoinApprovalRequired, setMemberJoinApprovalRequired] = useState(
    defaultMemberJoinApprovalRequired,
  );
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const initialPublishedToSquareRef = useRef(defaultPublishedToSquare);
  const isPending = squarePublishStatus === "pending";
  const isRejected = squarePublishStatus === "rejected";
  const canSubmit = true;
  const canResubmit = true;

  useEffect(() => {
    if (open) {
      const initial = defaultPublishedToSquare;
      initialPublishedToSquareRef.current = initial;
      setPublishToSquare(initial);
      setSelectedTagIds(defaultTagIds ?? []);
      setMemberJoinApprovalRequired(defaultMemberJoinApprovalRequired);
    }
  }, [open, defaultPublishedToSquare, defaultTagIds, defaultMemberJoinApprovalRequired]);

  const handleConfirm = () => {
    const initial = initialPublishedToSquareRef.current;
    if (publishToSquare === initial) {
      onOpenChange(false);
      return;
    }
    if (!canSubmit) return;
    onConfirm?.(
      publishToSquare,
      publishToSquare ? selectedTagIds : undefined,
      memberJoinApprovalRequired,
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleResubmit = () => {
    if (!canResubmit) return;
    onConfirm?.(true, selectedTagIds, memberJoinApprovalRequired);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{t("dataset.dialogs.publish.title")}</DialogTitle>
          </DialogHeader>

          <div className="bg-muted/50 mx-4 mt-8 space-y-3 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {t("dataset.dialogs.publish.publishToSquare")}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {skipReview
                    ? t("dataset.dialogs.publish.publishDirectly")
                    : t("dataset.dialogs.publish.requiresReview")}
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
                  {t("dataset.dialogs.publish.category")}{" "}
                  <span className="text-muted-foreground text-xs">
                    {t("dataset.dialogs.publish.optional")}
                  </span>
                </Label>

                <TagSelect
                  tagsSource="web"
                  type="dataset"
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                  placeholder={t("dataset.dialogs.publish.searchCategory")}
                />
              </div>
            )}
            {publishToSquare && (
              <div className="flex items-start justify-between gap-4 pt-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {t("dataset.dialogs.publish.memberConfirmation")}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("dataset.dialogs.publish.memberConfirmationDesc")}
                  </p>
                </div>
                <Switch
                  checked={memberJoinApprovalRequired}
                  onCheckedChange={setMemberJoinApprovalRequired}
                  className="shrink-0"
                />
              </div>
            )}
            {isPending && (
              <p className="text-muted-foreground text-xs">
                {t("dataset.dialogs.publish.currentStatus")}
              </p>
            )}
            {isRejected && (
              <div className="space-y-1">
                <p className="text-destructive text-xs">
                  {t("dataset.dialogs.publish.reviewRejected")}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive h-auto p-0 text-xs"
                  onClick={() => setReasonDialogOpen(true)}
                >
                  {t("dataset.dialogs.publish.viewRejectReason")}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-4 pt-6 pb-4">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {isPending ? t("dataset.dialogs.publish.close") : t("dataset.dialogs.publish.cancel")}
            </Button>
            {isRejected ? (
              <Button onClick={handleResubmit} disabled={loading || !canResubmit}>
                {loading
                  ? t("dataset.dialogs.publish.submitting")
                  : t("dataset.dialogs.publish.resubmit")}
              </Button>
            ) : !isPending ? (
              <Button onClick={handleConfirm} disabled={loading || !canSubmit}>
                {loading
                  ? t("dataset.dialogs.publish.submitting")
                  : t("dataset.dialogs.publish.confirm")}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dataset.dialogs.publish.rejectReason")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-[60px] py-2">
            <p className="text-muted-foreground text-sm">
              {squareRejectReason?.trim()
                ? squareRejectReason
                : t("dataset.dialogs.publish.noReason")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
              {t("dataset.dialogs.publish.gotIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
