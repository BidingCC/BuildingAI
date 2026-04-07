import { useI18n } from "@buildingai/i18n";
import { cn } from "@buildingai/ui/lib/utils";
import { FileUp } from "lucide-react";

export interface DocumentDropZoneProps {
  isOver: boolean;
  visible: boolean;
}

export function DocumentDropZone({ isOver, visible }: DocumentDropZoneProps) {
  const { t } = useI18n();
  if (visible) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 flex flex-col transition-all",
          isOver ? "bg-primary/5 backdrop-blur-xs" : "bg-background/60 backdrop-blur-xs",
        )}
      >
        <div className="flex flex-1 items-center justify-center">
          <div
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-12 py-10 transition-colors",
              isOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 bg-background/80",
            )}
          >
            <div
              className={cn(
                "rounded-xl p-3 transition-colors",
                isOver ? "bg-primary/10" : "bg-muted",
              )}
            >
              <FileUp className={cn("size-8", isOver ? "text-primary" : "text-muted-foreground")} />
            </div>
            <p
              className={cn(
                "text-sm font-medium transition-colors",
                isOver ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isOver ? t("dataset.document.dropToUpload") : t("dataset.document.dragDropHint")}
            </p>
          </div>
        </div>

        {!isOver && (
          <div className="border-muted-foreground/20 bg-background/80 flex shrink-0 items-center justify-center gap-2 border-t py-2.5">
            <FileUp className="text-muted-foreground size-3.5" />
            <p className="text-muted-foreground text-xs">
              {t("dataset.document.dragDropHintSmall")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 py-2.5">
      <FileUp className="text-muted-foreground/40 size-3.5" />
      <p className="text-muted-foreground/40 text-xs">{t("dataset.document.dragDropHintSmall")}</p>
    </div>
  );
}
