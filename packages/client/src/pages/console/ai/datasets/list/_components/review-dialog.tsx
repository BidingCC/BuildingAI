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
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const approveMutation = useApproveDatasetSquareMutation({
    onSuccess: () => {
      toast.success("已通过审核");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(`审核失败: ${e.message}`),
  });

  const rejectMutation = useRejectDatasetSquareMutation({
    onSuccess: () => {
      toast.success("已拒绝发布");
      onOpenChange(false);
      setShowRejectInput(false);
      setRejectReason("");
      onSuccess?.();
    },
    onError: (e) => toast.error(`操作失败: ${e.message}`),
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
          <DialogTitle>审核知识库</DialogTitle>
          <DialogDescription>
            {dataset ? `「${dataset.name}」申请发布到广场，请选择通过或拒绝。` : ""}
          </DialogDescription>
        </DialogHeader>
        {showRejectInput && (
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">拒绝原因（选填）</Label>
            <Textarea
              id="reject-reason"
              placeholder="请输入拒绝原因"
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
                返回
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={handleRejectSubmit}
              >
                {rejectMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                确认拒绝
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
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={handleRejectClick}
              >
                拒绝
              </Button>
              <Button type="button" disabled={pending} onClick={handleApprove}>
                {approveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                通过
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
