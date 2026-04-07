import type { ConsoleAgentItem } from "@buildingai/services/console";
import {
  useApproveAgentSquareMutation,
  useRejectAgentSquareMutation,
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
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@buildingai/i18n";

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: ConsoleAgentItem | null;
  onSuccess?: () => void;
};

export function ReviewDialog({ open, onOpenChange, agent, onSuccess }: ReviewDialogProps) {
  const { t } = useI18n();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const approveMutation = useApproveAgentSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.agent.review.approvedAndPublished"));
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const rejectMutation = useRejectAgentSquareMutation({
    onSuccess: () => {
      toast.success(t("ai.agent.review.rejected"));
      onOpenChange(false);
      setShowRejectInput(false);
      setRejectReason("");
      onSuccess?.();
    },
  });

  const handleApprove = () => {
    if (!agent) return;
    approveMutation.mutate(agent.id);
  };

  const handleRejectSubmit = () => {
    if (!agent) return;
    rejectMutation.mutate({ id: agent.id, reason: rejectReason.trim() || undefined });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setShowRejectInput(false);
      setRejectReason("");
    }
    onOpenChange(next);
  };

  const pending = approveMutation.isPending || rejectMutation.isPending;
  const openingQuestions = agent?.openingQuestions ?? [];
  const quickCommands = agent?.quickCommands ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("ai.agent.review.title")}</DialogTitle>
          <DialogDescription>
            {agent ? t("ai.agent.review.description", { name: agent.name }) : ""}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-72 rounded-md border md:max-h-[60vh]">
          <div className="space-y-4 p-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("ai.agent.review.roleSetting")}</div>
              <div className="text-muted-foreground text-sm whitespace-pre-wrap">
                {agent?.rolePrompt?.trim() || t("ai.agent.review.notConfigured")}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t("ai.agent.review.openingStatement")}</div>
              <div className="text-muted-foreground text-sm whitespace-pre-wrap">
                {agent?.openingStatement?.trim() || t("ai.agent.review.notConfigured")}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t("ai.agent.review.openingQuestions")}</div>
              {openingQuestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {openingQuestions.map((question, index) => (
                    <div
                      key={`${question}-${index}`}
                      className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs"
                    >
                      {question}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  {t("ai.agent.review.notConfigured")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t("ai.agent.review.quickCommands")}</div>
              {quickCommands.length > 0 ? (
                <div className="space-y-2">
                  {quickCommands.map((command, index) => (
                    <div key={`${command.name}-${index}`} className="bg-muted/40 rounded-md p-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>
                          {command.name || `${t("ai.agent.review.command")} ${index + 1}`}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {command.replyType === "custom"
                            ? t("ai.agent.review.customReply")
                            : t("ai.agent.review.modelReply")}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                        {t("ai.agent.review.triggerWord")}:{" "}
                        {command.content?.trim() || t("ai.agent.review.notConfigured")}
                      </div>
                      {command.replyType === "custom" ? (
                        <div className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                          {t("ai.agent.review.replyContent")}:{" "}
                          {command.replyContent?.trim() || t("ai.agent.review.notConfigured")}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  {t("ai.agent.review.notConfigured")}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        {showRejectInput && (
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">{t("ai.agent.review.rejectReason")}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t("ai.agent.review.rejectReasonPlaceholder")}
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
                {t("ai.agent.review.back")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={handleRejectSubmit}
              >
                {rejectMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("ai.agent.review.confirmReject")}
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
                {t("ai.agent.review.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => setShowRejectInput(true)}
              >
                {t("ai.agent.review.reject")}
              </Button>
              <Button type="button" disabled={pending} onClick={handleApprove}>
                {approveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("ai.agent.review.approve")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
