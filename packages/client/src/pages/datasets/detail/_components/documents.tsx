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
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import {
  ArrowLeftRightIcon,
  FilesIcon,
  FileText,
  MoreHorizontal,
  Pencil,
  Tag,
  TrashIcon,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { memo, useCallback, useMemo, useState } from "react";

export interface DocumentItem {
  id: string;
  title: string;
  summary?: string;
  fileType: string;
  fileSize: string;
  tags?: string[];
  thumbnail?: string;
  number?: string;
}

export interface DocumentListProps {
  documents?: DocumentItem[];
  uploadSlot?: ReactNode;
  onDocumentClick?: (document: DocumentItem) => void;
  searchExpanded?: boolean;
  searchResultCount?: number;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onBatchEditTags?: (ids: string[]) => void;
  onBatchMove?: (ids: string[]) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchCopy?: (ids: string[]) => void;
  onEditTags?: (document: DocumentItem) => void;
  onMove?: (document: DocumentItem) => void;
  onDelete?: (document: DocumentItem) => void;
  onCopy?: (document: DocumentItem) => void;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes("Word") || fileType.includes("word")) {
    return <FileText className="size-4 text-blue-600" />;
  }
  if (fileType.includes("PDF") || fileType.includes("pdf")) {
    return <FileText className="size-4 text-red-600" />;
  }
  return <FileText className="size-4 text-gray-500" />;
};

export function DocumentBatchActions({
  selectedCount,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
  onClose,
  className,
}: {
  selectedCount: number;
  onEditTags?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  if (selectedCount <= 0) return null;
  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEditTags}
            aria-label="编辑标签"
          >
            <Tag className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>编辑标签</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={onMove} aria-label="移动">
            <ArrowLeftRightIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>移动</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={onCopy} aria-label="复制">
            <FilesIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>复制</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onDelete}
            aria-label="删除"
          >
            <TrashIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label="退出"
          >
            <X className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>退出</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface DocumentCardProps {
  document: DocumentItem;
  selected?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
  onClick?: (document: DocumentItem) => void;
  onEditTags?: (document: DocumentItem) => void;
  onMove?: (document: DocumentItem) => void;
  onDelete?: (document: DocumentItem) => void;
  onCopy?: (document: DocumentItem) => void;
}

const DocumentCard = memo(function DocumentCard({
  document,
  selected,
  onSelectChange,
  onClick,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
}: DocumentCardProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const fileIcon = useMemo(() => getFileIcon(document.fileType), [document.fileType]);
  const hasThumbnail = document.thumbnail != null && String(document.thumbnail).startsWith("http");

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-doc-card-actions]")) return;
      onClick?.(document);
    },
    [document, onClick],
  );

  const stopProp = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation(),
    [],
  );

  return (
    <Card
      className={cn(
        "group/card bg-sidebar relative cursor-pointer rounded-lg border-0 shadow-none ring-0 transition-colors",
      )}
      onClick={handleCardClick}
      size="sm"
    >
      <CardContent>
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
            onClick={stopProp}
            onPointerDown={stopProp}
            aria-label={`选择 ${document.title}`}
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
                onClick={stopProp}
                onPointerDown={stopProp}
                aria-label="更多操作"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={stopProp}>
              <DropdownMenuItem onClick={() => onEditTags?.(document)}>
                <Pencil className="size-4" />
                编辑标签
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove?.(document)}>
                <ArrowLeftRightIcon className="size-4" />
                移动
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(document)} variant="destructive">
                <TrashIcon className="size-4" />
                删除
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy?.(document)}>
                <FilesIcon className="size-4" />
                复制
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              {document.number && (
                <div className="text-muted-foreground mb-1 text-xs">{document.number}</div>
              )}
              <div className="mb-2 line-clamp-2 text-sm font-semibold">{document.title}</div>
              {document.summary && (
                <div className="text-muted-foreground line-clamp-2 text-xs">
                  <span className="font-medium">AI生成摘要:</span> {document.summary}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <div className="bg-muted size-16 overflow-hidden rounded-lg">
                {hasThumbnail ? (
                  <img
                    src={document.thumbnail!}
                    alt={document.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">{fileIcon}</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {fileIcon}
              <span className="text-muted-foreground truncate text-xs">
                {document.fileType} {document.fileSize}
              </span>
            </div>
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.map((tag, index) => (
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
  );
});

export function DocumentList({
  documents = [],
  uploadSlot,
  onDocumentClick,
  searchExpanded,
  searchResultCount = 0,
  selectedIds = [],
  onSelectedIdsChange,
  onBatchEditTags,
  onBatchMove,
  onBatchDelete,
  onBatchCopy,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
}: DocumentListProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasSelection = selectedIds.length > 0;

  const handleSelect = useCallback(
    (id: string, checked: boolean) => {
      if (checked) {
        onSelectedIdsChange?.([...selectedIds, id]);
      } else {
        onSelectedIdsChange?.(selectedIds.filter((x) => x !== id));
      }
    },
    [selectedIds, onSelectedIdsChange],
  );

  const handleBatchEditTags = useCallback(
    () => onBatchEditTags?.(selectedIds),
    [selectedIds, onBatchEditTags],
  );
  const handleBatchMove = useCallback(() => onBatchMove?.(selectedIds), [selectedIds, onBatchMove]);
  const handleBatchDelete = useCallback(
    () => onBatchDelete?.(selectedIds),
    [selectedIds, onBatchDelete],
  );
  const handleBatchCopy = useCallback(() => onBatchCopy?.(selectedIds), [selectedIds, onBatchCopy]);
  const handleClose = useCallback(() => onSelectedIdsChange?.([]), [onSelectedIdsChange]);

  return (
    <div className="space-y-4">
      {searchExpanded && (
        <div className="flex h-10 items-center justify-between">
          <span className="text-muted-foreground text-sm">搜索到 {searchResultCount} 个内容</span>
          {hasSelection && (
            <DocumentBatchActions
              selectedCount={selectedIds.length}
              onEditTags={handleBatchEditTags}
              onMove={handleBatchMove}
              onDelete={handleBatchDelete}
              onCopy={handleBatchCopy}
              onClose={handleClose}
            />
          )}
        </div>
      )}
      {uploadSlot !== undefined && <div>{uploadSlot ?? null}</div>}
      <div className="space-y-3">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            selected={selectedSet.has(doc.id)}
            onSelectChange={handleSelect}
            onClick={onDocumentClick}
            onEditTags={onEditTags}
            onMove={onMove}
            onDelete={onDelete}
            onCopy={onCopy}
          />
        ))}
        {documents.length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">暂无内容</div>
        )}
      </div>
    </div>
  );
}
