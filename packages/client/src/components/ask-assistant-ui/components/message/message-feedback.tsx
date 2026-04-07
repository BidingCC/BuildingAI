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
import { useI18n } from "@buildingai/i18n";
import { XIcon } from "lucide-react";
import { memo, useState } from "react";

const DISLIKE_REASONS = [
  "feedbackReasonInaccurate",
  "feedbackReasonIncomplete",
  "feedbackReasonIrrelevant",
  "feedbackReasonBiased",
  "feedbackReasonPoorFormat",
  "feedbackReasonCodeIncorrect",
  "feedbackReasonShouldNotUseMemory",
  "feedbackReasonDislikePersona",
  "feedbackReasonDislikeStyle",
  "feedbackReasonFactuallyIncorrect",
  "feedbackReasonInstructionNotFollowed",
  "feedbackReasonOther",
];

const FEEDBACK_CARD_REASONS = [
  "feedbackReasonCodeIncorrect",
  "feedbackReasonFactuallyIncorrect",
  "feedbackReasonInaccurate",
  "feedbackReasonIncomplete",
  "feedbackReasonIrrelevant",
  "feedbackReasonInstructionNotFollowed",
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
  const { t } = useI18n();
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
            <p className="text-sm font-medium">{t("message.feedbackTitle")}</p>
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
                {t(`message.${reason}`)}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-auto px-3 py-1.5 text-xs"
              onClick={onMore}
            >
              {t("message.more")}
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
  const { t } = useI18n();
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
    const reasons = selectedReasons.filter((r) => r !== "message.feedbackReasonOther");
    const translatedReasons = reasons.map((r) => t(r));
    let finalReason: string | undefined;
    if (translatedReasons.length > 0 && customReason.trim()) {
      finalReason = `${translatedReasons.join("、")}；${customReason}`;
    } else if (translatedReasons.length > 0) {
      finalReason = translatedReasons.join("、");
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
          <DialogTitle>{t("message.feedbackTitle")}</DialogTitle>
          <DialogDescription>{t("message.feedbackDescription")}</DialogDescription>
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
                  {t(`message.${reason}`)}
                </Button>
              );
            })}
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder={t("message.feedbackReasonPlaceholder")}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>{t("action.submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
