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
import { cn } from "@buildingai/ui/lib/utils";
import {
  ArrowLeftRightIcon,
  FilesIcon,
  FileText,
  MoreHorizontal,
  Pencil,
  TrashIcon,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

import { bytesToReadable, formatFileType } from "@/utils/format";

// ============================================================================
// 文件图标（基于 MIME 类型）
// ============================================================================

function getFileIcon(fileType: string) {
  const m = fileType?.toLowerCase() ?? "";
  if (m.includes("word") || m.includes("doc")) {
    return <FileText className="size-4 text-blue-600" />;
  }
  if (m.includes("pdf")) {
    return <FileText className="size-4 text-red-600" />;
  }
  if (m.includes("excel") || m.includes("spreadsheet") || m.includes("csv")) {
    return <FileText className="size-4 text-green-600" />;
  }
  if (m.includes("powerpoint") || m.includes("presentation")) {
    return <FileText className="size-4 text-orange-600" />;
  }
  return <FileText className="size-4 text-gray-500" />;
}

// ============================================================================
// DocumentCard
// ============================================================================

export interface DocumentCardProps {
  document: DatasetsDocument;
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
  const fileSizeStr = useMemo(() => bytesToReadable(document.fileSize), [document.fileSize]);
  const fileTypeLabel = useMemo(() => formatFileType(document.fileType), [document.fileType]);

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
    <Card
      className={cn(
        "group/card bg-sidebar relative cursor-pointer rounded-lg border-0 shadow-none ring-0 transition-colors",
      )}
      onClick={handleCardClick}
      size="sm"
    >
      <CardContent>
        {/* 选择框 */}
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

        {/* 更多操作 */}
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

        {/* 内容区 */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 line-clamp-2 text-sm font-semibold">{document.fileName}</div>
              {document.summary != null && document.summary !== "" && (
                <div className="text-muted-foreground line-clamp-2 text-xs">
                  <span className="font-medium">AI生成摘要:</span> {document.summary}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <div className="bg-muted flex size-16 h-full w-full items-center justify-center rounded-lg">
                {fileIcon}
              </div>
            </div>
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {fileIcon}
              <span className="text-muted-foreground truncate text-xs">
                {fileTypeLabel} {fileSizeStr}
              </span>
            </div>
            {document.tags != null && document.tags.length > 0 && (
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
