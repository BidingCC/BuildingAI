import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { cn } from "@buildingai/ui/lib/utils";
import { XIcon } from "lucide-react";
import { memo, useState } from "react";

const DISLIKE_REASONS = [
  "回答不准确",
  "回答不完整",
  "回答不相关",
  "回答有偏见",
  "回答格式不佳",
  "代码不正确",
  "不应该使用记忆",
  "不喜欢此人物",
  "不喜欢这种风格",
  "与事实不符",
  "未完全遵循指令",
  "其他",
];

const FEEDBACK_CARD_REASONS = [
  "代码不正确",
  "与事实不符",
  "回答不准确",
  "回答不完整",
  "回答不相关",
  "未完全遵循指令",
];

export interface FeedbackCardProps {
  onSelectReason: (reason: string) => void;
  onMore: () => void;
  onClose: () => void;
}

export const FeedbackCard = memo(function FeedbackCard({
  onSelectReason,
  onMore,
  onClose,
}: FeedbackCardProps) {
  return (
    <div
      className="mt-2"
      style={{
        animation: "slideDownFadeIn 0.5s ease-out forwards",
      }}
    >
      <style>{`
        @keyframes slideDownFadeIn {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 300px;
            transform: translateY(0);
          }
        }
      `}</style>
      <Card className="w-full py-4">
        <CardContent className="px-4 py-0">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium">请与我们分享更多信息:</p>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="h-6 w-6">
              <XIcon className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FEEDBACK_CARD_REASONS.map((reason) => (
              <Button
                key={reason}
                variant="outline"
                size="sm"
                className="h-auto px-3 py-1.5 text-xs"
                onClick={() => onSelectReason(reason)}
              >
                {reason}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-auto px-3 py-1.5 text-xs"
              onClick={onMore}
            >
              更多...
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export interface MessageFeedbackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason?: string) => void;
  onCancel?: () => void;
}

export const MessageFeedback = memo(function MessageFeedback({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
}: MessageFeedbackProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((r) => r !== reason);
      }
      return [...prev, reason];
    });
  };

  const handleSubmit = async () => {
    const reasons = selectedReasons.filter((r) => r !== "其他");
    let finalReason: string | undefined;
    if (reasons.length > 0 && customReason.trim()) {
      finalReason = `${reasons.join("、")}；${customReason}`;
    } else if (reasons.length > 0) {
      finalReason = reasons.join("、");
    } else if (customReason.trim()) {
      finalReason = customReason.trim();
    }
    await onSubmit(finalReason);
    setSelectedReasons([]);
    setCustomReason("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedReasons([]);
    setCustomReason("");
    onCancel?.();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleCancel();
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享反馈</DialogTitle>
          <DialogDescription>请选择您不喜欢这条消息的原因（可选）</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2">
            {DISLIKE_REASONS.map((reason) => {
              const isSelected = selectedReasons.includes(reason);
              return (
                <Button
                  key={reason}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-auto px-3 py-1.5 text-xs",
                    isSelected && "bg-primary text-primary-foreground",
                  )}
                  onClick={() => handleReasonToggle(reason)}
                >
                  {reason}
                </Button>
              );
            })}
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="分享详细信息 (可选)"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
