import type { SquarePublishStatus } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useEffect, useRef, useState } from "react";

export interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPublishedToSquare?: boolean;
  squarePublishStatus?: SquarePublishStatus;
  squareRejectReason?: string | null;
  loading?: boolean;
  onConfirm?: (publishToSquare: boolean) => void;
}

export function PublishDialog({
  open,
  onOpenChange,
  defaultPublishedToSquare = false,
  squarePublishStatus = "none",
  squareRejectReason,
  loading = false,
  onConfirm,
}: PublishDialogProps) {
  const [publishToSquare, setPublishToSquare] = useState(defaultPublishedToSquare);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const initialPublishedToSquareRef = useRef(defaultPublishedToSquare);
  const isPending = squarePublishStatus === "pending";
  const isRejected = squarePublishStatus === "rejected";

  useEffect(() => {
    if (open) {
      const initial = defaultPublishedToSquare;
      initialPublishedToSquareRef.current = initial;
      setPublishToSquare(initial);
    }
  }, [open, defaultPublishedToSquare]);

  const handleConfirm = () => {
    const initial = initialPublishedToSquareRef.current;
    if (publishToSquare === initial) {
      onOpenChange(false);
      return;
    }
    onConfirm?.(publishToSquare);
    // 不在此处关闭弹窗，由父组件在接口成功后再关闭
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>知识广场发布设置</DialogTitle>
          </DialogHeader>

          <div className="bg-muted/50 mx-4 mt-8 space-y-3 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">是否发布到知识广场</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  确认发布后需管理员审核，审核通过后知识广场将展示此知识库
                </p>
              </div>
              <Switch
                checked={publishToSquare}
                onCheckedChange={setPublishToSquare}
                className="shrink-0"
                disabled={isPending}
              />
            </div>
            {isPending && (
              <p className="text-muted-foreground text-xs">当前状态：待审核，请等待管理员审核。</p>
            )}
            {isRejected && (
              <div className="space-y-1">
                <p className="text-destructive text-xs">当前状态：审核未通过</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive h-auto p-0 text-xs"
                  onClick={() => setReasonDialogOpen(true)}
                >
                  查看拒绝原因
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-4 pt-6 pb-4">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {isPending ? "关闭" : "取消"}
            </Button>
            {!isPending && (
              <Button onClick={handleConfirm} disabled={loading}>
                {loading ? "提交中…" : "确定"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 拒绝原因弹窗（与主弹窗平级，避免嵌套） */}
      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝原因</DialogTitle>
          </DialogHeader>
          <div className="min-h-[60px] py-2">
            <p className="text-muted-foreground text-sm">
              {squareRejectReason?.trim()
                ? squareRejectReason
                : "暂无具体原因，如有疑问请联系管理员。"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
