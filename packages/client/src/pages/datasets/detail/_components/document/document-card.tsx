import type { DatasetsDocument } from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Progress } from "@buildingai/ui/components/ui/progress";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { bytesToReadable } from "@buildingai/utils/format";
import {
  ArrowLeftRightIcon,
  FilesIcon,
  FileText,
  MoreHorizontal,
  Pencil,
  TrashIcon,
} from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";

import { FileFormatIcon } from "@/components/file-fomat-icons";
import { formatFileType, getFileFormatKey } from "@/utils/format";

export interface DocumentCardProps {
  document: DatasetsDocument;
  canManageDocuments?: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
  onClick?: (document: DatasetsDocument) => void;
  onEditTags?: (document: DatasetsDocument) => void;
  onMove?: (document: DatasetsDocument) => void;
  onDelete?: (document: DatasetsDocument) => void;
  onCopy?: (document: DatasetsDocument) => void;
}

export const DocumentCard = memo(function DocumentCard({
  document,
  canManageDocuments = false,
  selected,
  onSelectChange,
  onClick,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
}: DocumentCardProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverEnter = useCallback(() => {
    if (hoverLeaveTimerRef.current != null) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    setHoverOpen(true);
  }, []);

  const handleHoverLeave = useCallback(() => {
    hoverLeaveTimerRef.current = setTimeout(() => setHoverOpen(false), 150);
  }, []);
  const formatKey = useMemo(() => getFileFormatKey(document.fileType), [document.fileType]);
  const fileIconMain = useMemo(
    () =>
      formatKey ? (
        <FileFormatIcon format={formatKey} className="size-10" />
      ) : (
        <FileText className="text-muted-foreground size-10" />
      ),
    [formatKey],
  );
  const fileIconFooter = useMemo(
    () =>
      formatKey ? (
        <FileFormatIcon format={formatKey} className="size-4" />
      ) : (
        <FileText className="text-muted-foreground size-4" />
      ),
    [formatKey],
  );
  const fileSizeStr = useMemo(() => bytesToReadable(document.fileSize), [document.fileSize]);
  const fileTypeLabel = useMemo(() => formatFileType(document.fileType), [document.fileType]);
  const progressPercent = Math.min(100, Math.max(0, Number(document.progress) || 0));
  const inProgress = document.status === "pending" || document.status === "processing";
  const summaryGenerating = Boolean(document.summaryGenerating);
  const summaryText = document.summary?.trim() || null;

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-doc-card-actions]")) return;
      onClick?.(document);
    },
    [document, onClick],
  );

  const stopPropagation = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation(),
    [],
  );

  return (
    <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
      <div onMouseEnter={handleHoverEnter} onMouseLeave={handleHoverLeave} className="relative">
        <PopoverTrigger asChild>
          <Card
            className={cn(
              "group/card bg-sidebar relative cursor-pointer rounded-lg border-0 shadow-none ring-0 transition-colors",
            )}
            onClick={handleCardClick}
            size="sm"
          >
            <CardContent>
              {canManageDocuments && (
                <>
                  <div
                    data-doc-card-actions
                    className={cn(
                      "absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover/card:opacity-100",
                      selected && "opacity-100",
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(v) => onSelectChange?.(document.id, v === true)}
                      onClick={stopPropagation}
                      onPointerDown={stopPropagation}
                      aria-label={`选择 ${document.fileName}`}
                    />
                  </div>

                  <div
                    data-doc-card-actions
                    className={cn(
                      "absolute right-2 bottom-2 z-10 opacity-0 transition-opacity group-hover/card:opacity-100",
                      moreOpen && "opacity-100",
                    )}
                  >
                    <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="default"
                          className="size-6 border-0 shadow-none focus-within:ring-0 focus-visible:ring-0"
                          onClick={stopPropagation}
                          onPointerDown={stopPropagation}
                          aria-label="更多操作"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={stopPropagation}>
                        <DropdownMenuItem onClick={() => onEditTags?.(document)}>
                          <Pencil className="size-4" />
                          编辑标签
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMove?.(document)}>
                          <ArrowLeftRightIcon className="size-4" />
                          移动
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCopy?.(document)}>
                          <FilesIcon className="size-4" />
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(document)}
                          variant="destructive"
                        >
                          <TrashIcon className="size-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="mb-2 w-56 truncate text-sm font-semibold">
                            {document.fileName}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs wrap-break-word">
                          <p>{document.fileName}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {summaryGenerating && (
                      <p className="text-muted-foreground mt-1 text-xs">摘要生成中</p>
                    )}
                    {!summaryGenerating && summaryText && (
                      <div className="text-muted-foreground line-clamp-2 text-xs leading-5">
                        <span className="font-medium">AI生成摘要:</span> {summaryText}
                      </div>
                    )}
                    {inProgress && (
                      <div className="mt-2 space-y-1">
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>处理中</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    )}
                    {document.status === "failed" && document.error && (
                      <p className="text-destructive mt-1 line-clamp-1 text-xs">{document.error}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <div className="flex h-full w-full items-start justify-center">
                      {fileIconMain}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {fileIconFooter}
                    <span className="text-muted-foreground truncate text-xs">
                      {fileTypeLabel} {fileSizeStr}
                    </span>
                  </div>
                  {document.tags != null && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {document.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="px-2 py-0 text-xs">
                          ◇{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverTrigger>
      </div>
      <PopoverContent
        side="right"
        align="start"
        className="w-80"
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-semibold wrap-break-word">{document.fileName}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              上传时间：
              <TimeText value={document.createdAt} variant="datetime" />
            </p>
          </div>
          {summaryGenerating && <div className="text-muted-foreground text-xs">摘要生成中</div>}
          {!summaryGenerating && summaryText && (
            <div className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-foreground font-medium">摘要：</span>
              {summaryText}
            </div>
          )}
          {document.tags != null && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="px-2 py-0 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
