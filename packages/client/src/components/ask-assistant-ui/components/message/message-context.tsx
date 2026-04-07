import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { useI18n } from "@buildingai/i18n";
import { ListChecks } from "lucide-react";
import { memo, useState } from "react";

export interface MessageContextProps {
  messages: Array<{ role: string; content: string }>;
}

const roleLabel: Record<string, string> = {
  system: "roles.system",
  user: "roles.user",
  assistant: "roles.assistant",
};

export const MessageContext = memo(function MessageContext({ messages }: MessageContextProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!messages?.length) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={() => setOpen(true)}
          >
            <ListChecks className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("action.viewConversationContext")}</p>
        </TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-w-2xl flex-col">
          <DialogHeader>
            <DialogTitle>{t("message.conversationContext")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("message.fullContextSentToModel")}
          </p>
          <ScrollArea className="h-[400px] rounded-md border p-2 text-sm">
            <div className="space-y-3 pr-2">
              {messages.map((msg, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-muted-foreground font-medium">
                    {t(`message.${roleLabel[msg.role]}`) ?? msg.role}
                  </span>
                  <pre className="bg-muted/50 rounded p-2 text-xs wrap-break-word whitespace-pre-wrap">
                    {msg.content || t("action.noContent")}
                  </pre>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
});
