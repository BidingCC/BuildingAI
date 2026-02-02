import type { DatasetsDocument } from "@buildingai/services/web";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { DocumentBatchActions } from "./document-batch-actions";
import { DocumentCard } from "./document-card";

export interface DocumentListProps {
  documents?: DatasetsDocument[];
  uploadSlot?: ReactNode;
  onDocumentClick?: (document: DatasetsDocument) => void;
  searchExpanded?: boolean;
  searchResultCount?: number;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onBatchEditTags?: (ids: string[]) => void;
  onBatchMove?: (ids: string[]) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchCopy?: (ids: string[]) => void;
  onEditTags?: (document: DatasetsDocument) => void;
  onMove?: (document: DatasetsDocument) => void;
  onDelete?: (document: DatasetsDocument) => void;
  onCopy?: (document: DatasetsDocument) => void;
}

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
      {/* 搜索结果头部 */}
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

      {/* 上传入口 */}
      {uploadSlot !== undefined && <div>{uploadSlot ?? null}</div>}

      {/* 文档列表 */}
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
      </div>
    </div>
  );
}
