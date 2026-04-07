import { useI18n } from "@buildingai/i18n";
import type { DatasetsDocument } from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Progress } from "@buildingai/ui/components/ui/progress";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { bytesToReadable } from "@buildingai/utils/format";
import {
  ArrowLeftRightIcon,
  FilesIcon,
  FileText,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  TrashIcon,
} from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";

import { FileFormatIcon } from "@/components/file-fomat-icons";
import { getFileFormatKey } from "@/utils/format";

function DocumentTableHeadRow({
  canManageDocuments,
  firstCell,
}: {
  canManageDocuments: boolean;
  firstCell: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <TableHeader>
      <TableRow className="border-0! hover:bg-transparent [&_th]:py-4">
        <TableHead className={canManageDocuments ? "w-2 pr-0!" : "pr-0!"}>{firstCell}</TableHead>
        <TableHead className="w-[240px]">{t("dataset.document.fileName")}</TableHead>
        <TableHead className="hidden w-1/2 @xl:table-cell">
          {t("dataset.document.summary")}
        </TableHead>
        <TableHead className="hidden w-28 @lg:table-cell">
          {t("dataset.document.lastEdited")}
        </TableHead>
        <TableHead className="w-12 text-center">{t("dataset.document.actions")}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function DocumentTableHeader({
  canManageDocuments = false,
}: {
  canManageDocuments?: boolean;
}) {
  return (
    <Table>
      <DocumentTableHeadRow
        canManageDocuments={canManageDocuments}
        firstCell={<Skeleton className="size-4 bg-transparent!" />}
      />
    </Table>
  );
}

export function DocumentTableSkeleton({
  canManageDocuments = false,
}: {
  canManageDocuments?: boolean;
}) {
  return (
    <Table>
      <DocumentTableHeadRow
        canManageDocuments={canManageDocuments}
        firstCell={canManageDocuments ? <Skeleton className="size-4" /> : null}
      />
      <TableBody>
        {Array.from({ length: 7 }).map((_, i) => (
          <TableRow className="border-0!" key={i}>
            {canManageDocuments && (
              <TableCell className="pr-0!">
                <Skeleton className="size-4" />
              </TableCell>
            )}
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden @xl:table-cell">
              <Skeleton className="h-4 w-90" />
            </TableCell>
            <TableCell className="hidden @lg:table-cell">
              <Skeleton className="h-4 w-22" />
            </TableCell>
            {canManageDocuments && (
              <TableCell className="text-center">
                <Skeleton className="mx-auto size-8 rounded" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export interface DocumentTableProps {
  documents: DatasetsDocument[];
  canManageDocuments?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onDocumentClick?: (document: DatasetsDocument) => void;
  onEditTags?: (document: DatasetsDocument) => void;
  onMove?: (document: DatasetsDocument) => void;
  onDelete?: (document: DatasetsDocument) => void;
  onCopy?: (document: DatasetsDocument) => void;
  onRetryVectorization?: (document: DatasetsDocument) => void;
}

export function DocumentTable({
  documents,
  canManageDocuments = false,
  selectedIds = [],
  onSelectedIdsChange,
  onDocumentClick,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
  onRetryVectorization,
}: DocumentTableProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      onSelectedIdsChange?.(checked ? documents.map((d) => d.id) : []);
    },
    [documents, onSelectedIdsChange],
  );

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

  if (documents.length === 0) {
    return null;
  }

  return (
    <Table>
      <DocumentTableHeadRow
        canManageDocuments={canManageDocuments}
        firstCell={
          canManageDocuments ? (
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => handleSelectAll(v === true)}
              aria-label={t("dataset.document.selectAll")}
            />
          ) : null
        }
      />
      <TableBody>
        {documents.map((doc) => (
          <DocumentTableRow
            key={doc.id}
            document={doc}
            canManageDocuments={canManageDocuments}
            selected={selectedSet.has(doc.id)}
            onSelectChange={handleSelect}
            onClick={onDocumentClick}
            onEditTags={onEditTags}
            onMove={onMove}
            onDelete={onDelete}
            onCopy={onCopy}
            onRetryVectorization={onRetryVectorization}
          />
        ))}
      </TableBody>
    </Table>
  );
}

interface DocumentTableRowProps {
  document: DatasetsDocument;
  canManageDocuments: boolean;
  selected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
  onClick?: (document: DatasetsDocument) => void;
  onEditTags?: (document: DatasetsDocument) => void;
  onMove?: (document: DatasetsDocument) => void;
  onDelete?: (document: DatasetsDocument) => void;
  onCopy?: (document: DatasetsDocument) => void;
  onRetryVectorization?: (document: DatasetsDocument) => void;
}

const DocumentTableRow = memo(function DocumentTableRow({
  document,
  canManageDocuments,
  selected,
  onSelectChange,
  onClick,
  onEditTags,
  onMove,
  onDelete,
  onCopy,
  onRetryVectorization,
}: DocumentTableRowProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatKey = useMemo(() => getFileFormatKey(document.fileType), [document.fileType]);
  const fileIcon = useMemo(
    () =>
      formatKey ? (
        <FileFormatIcon format={formatKey} className="size-8" />
      ) : (
        <FileText className="text-muted-foreground size-8" />
      ),
    [formatKey],
  );
  const fileSizeStr = useMemo(() => bytesToReadable(document.fileSize), [document.fileSize]);
  const fileExt = useMemo(() => {
    const dotIdx = document.fileName.lastIndexOf(".");
    return dotIdx > 0 ? document.fileName.slice(dotIdx + 1).toUpperCase() : "";
  }, [document.fileName]);
  const summaryText = document.summary?.trim() || null;
  const summaryGenerating = Boolean(document.summaryGenerating);
  const inProgress = document.status === "pending" || document.status === "processing";
  const progressPercent = Math.min(100, Math.max(0, Number(document.progress) || 0));

  const handleRowClick = useCallback(() => {
    onClick?.(document);
  }, [document, onClick]);

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

  return (
    <TableRow
      className={cn("group cursor-pointer border-0! [&_td]:py-4", selected && "bg-muted")}
      onClick={handleRowClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        {canManageDocuments ? (
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectChange(document.id, v === true)}
            aria-label={`${t("dataset.document.selectAll")} ${document.fileName}`}
          />
        ) : (
          <div className="w-2" />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="shrink-0">{fileIcon}</div>
          <div className="min-w-0 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-50 truncate text-sm font-medium">{document.fileName}</div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word">
                <p>{document.fileName}</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              {fileExt && <span>{fileExt}</span>}
              <span>{fileSizeStr}</span>
              <span className="@lg:hidden">
                <TimeText value={document.updatedAt || document.createdAt} variant="date" />
              </span>
            </div>
            {inProgress && (
              <div className="mt-1 flex items-center gap-2">
                <Progress value={progressPercent} className="h-1 w-24" />
                <span className="text-muted-foreground text-xs">{progressPercent}%</span>
              </div>
            )}
            {document.status === "failed" && document.error && (
              <p className="text-destructive mt-0.5 line-clamp-1 text-xs">{document.error}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden @xl:table-cell" onClick={(e) => e.stopPropagation()}>
        <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
          <PopoverTrigger asChild>
            <div
              className="flex max-w-full flex-col gap-1 outline-none"
              onMouseEnter={handleHoverEnter}
              onMouseLeave={handleHoverLeave}
            >
              {summaryGenerating ? (
                <span className="text-muted-foreground text-xs italic">
                  {t("dataset.document.generating")}
                </span>
              ) : summaryText ? (
                <p className="text-muted-foreground max-w-90 truncate text-sm">{summaryText}</p>
              ) : (
                <span className="text-muted-foreground/50 text-xs">--</span>
              )}
              {document.tags != null && document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {document.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                  {document.tags.length > 3 && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      +{document.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="w-80"
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
          >
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">
                {t("dataset.document.uploadTime")}
                <TimeText value={document.createdAt} variant="datetime" />
              </p>
              {summaryGenerating && (
                <span className="text-muted-foreground text-xs">
                  {t("dataset.document.summaryGenerating")}
                </span>
              )}
              {!summaryGenerating && summaryText && (
                <div className="text-muted-foreground text-xs leading-relaxed">
                  <span className="text-foreground font-medium">
                    {t("dataset.document.summaryLabel")}
                  </span>
                  <span className="whitespace-pre-wrap">{summaryText}</span>
                </div>
              )}
              {document.tags != null && document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {document.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="px-2 py-0 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className="hidden @lg:table-cell">
        <span className="text-muted-foreground text-sm">
          <TimeText value={document.updatedAt || document.createdAt} variant="date" />
        </span>
      </TableCell>
      {canManageDocuments && (
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {document.status === "failed" && (
                <DropdownMenuItem onClick={() => onRetryVectorization?.(document)}>
                  <RotateCcw className="size-4" />
                  {t("dataset.document.retry")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEditTags?.(document)}>
                <Pencil className="size-4" />
                {t("dataset.document.editTags")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove?.(document)}>
                <ArrowLeftRightIcon className="size-4" />
                {t("dataset.document.move")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy?.(document)}>
                <FilesIcon className="size-4" />
                {t("dataset.document.copy")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(document)} variant="destructive">
                <TrashIcon className="size-4" />
                {t("dataset.document.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
});
