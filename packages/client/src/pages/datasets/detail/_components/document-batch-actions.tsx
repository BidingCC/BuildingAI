import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowLeftRightIcon, FilesIcon, Tag, TrashIcon, X } from "lucide-react";

export interface DocumentBatchActionsProps {
  selectedCount: number;
  onEditTags?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onClose?: () => void;
  className?: string;
}

export function DocumentBatchActions({
  selectedCount,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
  onClose,
  className,
}: DocumentBatchActionsProps) {
  const { t } = useI18n();
  if (selectedCount <= 0) return null;

  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <ActionButton tooltip={t("dataset.document.editTags")} onClick={onEditTags}>
        <Tag className="size-4" />
      </ActionButton>

      <ActionButton tooltip={t("dataset.document.move")} onClick={onMove}>
        <ArrowLeftRightIcon className="size-4" />
      </ActionButton>

      <ActionButton tooltip={t("dataset.document.copy")} onClick={onCopy}>
        <FilesIcon className="size-4" />
      </ActionButton>

      <ActionButton tooltip={t("dataset.document.delete")} onClick={onDelete}>
        <TrashIcon className="size-4" />
      </ActionButton>

      <ActionButton tooltip={t("common.action.cancel")} onClick={onClose}>
        <X className="size-4" />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  tooltip,
  onClick,
  children,
}: {
  tooltip: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onClick}
          aria-label={tooltip}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
