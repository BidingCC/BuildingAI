import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useState } from "react";

export interface PublishSquareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (publishToSquare: boolean) => void;
}

export function PublishSquareDialog({ open, onOpenChange, onConfirm }: PublishSquareDialogProps) {
  const [publishToSquare, setPublishToSquare] = useState(false);

  const handleConfirm = () => {
    onConfirm?.(publishToSquare);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>知识广场发布设置</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 mx-4 mt-8 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">是否发布到知识广场</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                确认发布,且审核通过后,知识广场将展示此知识库
              </p>
            </div>
            <Switch
              checked={publishToSquare}
              onCheckedChange={setPublishToSquare}
              className="shrink-0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 pt-6 pb-4">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确定</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
