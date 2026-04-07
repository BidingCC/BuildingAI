import { useI18n } from "@buildingai/i18n";
import type { ConsoleDatasetItem } from "@buildingai/services/console";
import {
  useApproveDatasetSquareMutation,
  useRejectDatasetSquareMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: ConsoleDatasetItem | null;
  onSuccess?: () => void;
};

export function ReviewDialog({ open, onOpenChange, dataset, onSuccess }: ReviewDialogProps) {
  const { t } = useI18n();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const approveMutation = useApproveDatasetSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.dataset.review.approved"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(t("ai.dataset.review.approveFailed", { error: e.message })),
  });

  const rejectMutation = useRejectDatasetSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.dataset.review.rejected"));
      onOpenChange(false);
      setShowRejectInput(false);
      setRejectReason("");
      onSuccess?.();
    },
  });

  const handleApprove = () => {
    if (!dataset) return;
    approveMutation.mutate(dataset.id);
  };

  const handleRejectClick = () => {
    setShowRejectInput(true);
  };

  const handleRejectSubmit = () => {
    if (!dataset) return;
    rejectMutation.mutate({ id: dataset.id, reason: rejectReason.trim() || undefined });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setShowRejectInput(false);
      setRejectReason("");
    }
    onOpenChange(next);
  };

  const pending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("ai.dataset.review.title")}</DialogTitle>
          <DialogDescription>
            {dataset ? t("ai.dataset.review.applyDesc", { name: dataset.name }) : ""}
          </DialogDescription>
        </DialogHeader>
        {showRejectInput && (
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">{t("ai.dataset.review.rejectReason")}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t("ai.dataset.review.enterRejectReason")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        )}
        <DialogFooter className="gap-2">
          {showRejectInput ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setShowRejectInput(false)}
              >
                {t("ai.dataset.review.back")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={handleRejectSubmit}
              >
                {rejectMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("ai.dataset.review.confirmReject")}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                {t("ai.dataset.review.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={handleRejectClick}
              >
                {t("ai.dataset.review.reject")}
              </Button>
              <Button type="button" disabled={pending} onClick={handleApprove}>
                {approveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("ai.dataset.review.approve")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
