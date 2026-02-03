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
  if (selectedCount <= 0) return null;

  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <ActionButton tooltip="编辑标签" onClick={onEditTags}>
        <Tag className="size-4" />
      </ActionButton>

      <ActionButton tooltip="移动" onClick={onMove}>
        <ArrowLeftRightIcon className="size-4" />
      </ActionButton>

      <ActionButton tooltip="复制" onClick={onCopy}>
        <FilesIcon className="size-4" />
      </ActionButton>

      <ActionButton tooltip="删除" onClick={onDelete}>
        <TrashIcon className="size-4" />
      </ActionButton>

      <ActionButton tooltip="退出" onClick={onClose}>
        <X className="size-4" />
      </ActionButton>
    </div>
  );
}

// 操作按钮子组件
function ActionButton({
  tooltip,
  onClick,
  children,
}: {
  tooltip: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
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
