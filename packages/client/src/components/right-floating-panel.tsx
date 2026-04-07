import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function RightFloatingPanel({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();

  if (!open) return null;
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <div
        className="bg-background border-border fixed top-1/2 right-10 z-50 flex h-full max-h-[85vh] w-[420px] -translate-y-1/2 flex-col rounded-xl border shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="right-floating-panel-title"
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <h2 id="right-floating-panel-title" className="text-base font-semibold">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onOpenChange(false)}
            aria-label={t("action.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="chat-scroll flex h-full min-h-0 flex-col">
          <div className="h-full min-h-0">{children}</div>
        </div>
        {footer ? <div className="bg-muted shrink-0 rounded-b-xl px-4 py-3">{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}
