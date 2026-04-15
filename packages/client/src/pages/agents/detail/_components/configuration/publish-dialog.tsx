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
  none: "未提交",
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
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
  const publishSwitchChecked = isPending ? true : publishToSquare;
  const canSubmit = true;
  const canResubmit = true;

  const handleConfirm = () => {
    // const initial = initialPublishedToSquareRef.current;
    // if (publishToSquare === initial) {
    //   onOpenChange(false);
    //   return;
    // }
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
            <DialogTitle>智能体广场发布设置</DialogTitle>
          </DialogHeader>

          <div className="bg-muted/50 mx-4 mt-8 space-y-3 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">是否发布到智能体广场</p>
                  <span className="text-muted-foreground text-xs">
                    {statusLabelMap[squareStatus] ?? squareStatus}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {skipReview
                    ? "确认发布后将直接上架，智能体广场将展示此智能体"
                    : "确认发布后需管理员审核，审核通过后智能体广场将展示此智能体"}
                </p>
              </div>
              <Switch
                checked={publishSwitchChecked}
                onCheckedChange={setPublishToSquare}
                className="shrink-0"
                disabled={isPending}
              />
            </div>

            {publishToSquare && !isPending && (
              <div className="flex justify-between space-y-2 pt-2">
                <Label className="text-sm font-medium">
                  分类 <span className="text-muted-foreground text-xs">(可选)</span>
                </Label>
                <TagSelect
                  tagsSource="web"
                  type="app"
                  showManage={false}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                  placeholder="搜索分类"
                />
              </div>
            )}

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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {isPending ? "关闭" : "取消"}
            </Button>
            {isRejected ? (
              <Button onClick={handleResubmit} disabled={loading || !canResubmit}>
                {loading ? "提交中…" : "重新提交"}
              </Button>
            ) : !isPending ? (
              <Button onClick={handleConfirm} disabled={loading || !canSubmit}>
                {loading ? "提交中…" : "确定"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
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
