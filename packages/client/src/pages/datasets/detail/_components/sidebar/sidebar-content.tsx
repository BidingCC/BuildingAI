import type { Dataset, DatasetsDocument, DocumentSortBy } from "@buildingai/services/web";
import {
  useBatchDeleteDatasetsDocuments,
  useDeleteDatasetsDocument,
} from "@buildingai/services/web";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarContent as SidebarContentBase } from "@buildingai/ui/components/ui/sidebar";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { bytesToReadable } from "@buildingai/utils/format";
import { useCallback, useState } from "react";

import { useDocumentDrop, useDocumentSelection } from "../../hooks";
import { CopyDialog } from "../dialogs/copy-dialog";
import { EditTagsDialog, type EditTagsDialogMode } from "../dialogs/edit-tags-dialog";
import { MoveDialog } from "../dialogs/move-dialog";
import { UploadDialog } from "../dialogs/upload-dialog";
import { DocumentBatchActions, DocumentDropZone, DocumentList, DocumentToolbar } from "../document";
import { UploadTrigger } from "../upload";

export interface SidebarContentProps {
  dataset: Dataset | undefined;
  documents: DatasetsDocument[];
  sortBy?: DocumentSortBy;
  onSortChange?: (value: DocumentSortBy) => void;
  searchKeyword?: string;
  onSearchChange?: (value: string) => void;
  onUpload?: (files: File[]) => void;
  onDocumentClick?: (document: DatasetsDocument) => void;
}

export function SidebarContent({
  dataset,
  documents,
  sortBy = "uploadTime",
  onSortChange,
  searchKeyword = "",
  onSearchChange,
  onUpload,
  onDocumentClick,
}: SidebarContentProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editTagsOpen, setEditTagsOpen] = useState(false);
  const [editTagsMode, setEditTagsMode] = useState<EditTagsDialogMode>("single");
  const [editTagsDocument, setEditTagsDocument] = useState<DatasetsDocument | null>(null);
  const [editTagsDocumentIds, setEditTagsDocumentIds] = useState<string[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDocumentIds, setMoveDocumentIds] = useState<string[]>([]);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyDocumentIds, setCopyDocumentIds] = useState<string[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const canManageDocuments = dataset?.canManageDocuments ?? false;
  const datasetId = dataset?.id ?? "";

  const { confirm } = useAlertDialog();
  const deleteDocumentMutation = useDeleteDatasetsDocument(datasetId);
  const batchDeleteMutation = useBatchDeleteDatasetsDocuments(datasetId);

  const { selectedIds, clearSelection, selectAll } = useDocumentSelection();
  const { zoneRef, isOver, showDropZone, handlers } = useDocumentDrop({
    enabled: canManageDocuments,
    onDrop: onUpload,
  });

  const handleUpload = (files: File[]) => {
    onUpload?.(files);
    setUploadDialogOpen(false);
  };

  const handleDelete = useCallback(
    async (doc: DatasetsDocument) => {
      if (!datasetId) return;
      try {
        await confirm({
          title: "确认删除",
          description: `确定要删除文档「${doc.fileName}」吗？此操作不可撤销。`,
          confirmText: "删除",
          confirmVariant: "destructive",
        });
        deleteDocumentMutation.mutate(doc.id);
      } catch {
        // 用户取消
      }
    },
    [datasetId, confirm, deleteDocumentMutation],
  );

  const handleBatchDelete = useCallback(
    async (ids: string[]) => {
      if (!datasetId || ids.length === 0) return;
      try {
        await confirm({
          title: "确认批量删除",
          description: `确定要删除选中的 ${ids.length} 个文档吗？此操作不可撤销。`,
          confirmText: "删除",
          confirmVariant: "destructive",
        });
        batchDeleteMutation.mutate(ids, { onSuccess: () => clearSelection() });
      } catch {
        // 用户取消
      }
    },
    [datasetId, confirm, batchDeleteMutation, clearSelection],
  );

  const handleEditTags = useCallback((doc: DatasetsDocument) => {
    setEditTagsMode("single");
    setEditTagsDocument(doc);
    setEditTagsDocumentIds([]);
    setEditTagsOpen(true);
  }, []);

  const handleBatchEditTags = useCallback((ids: string[]) => {
    setEditTagsMode("batch");
    setEditTagsDocument(null);
    setEditTagsDocumentIds(ids);
    setEditTagsOpen(true);
  }, []);

  const handleEditTagsSuccess = useCallback(() => {
    if (editTagsMode === "batch") clearSelection();
  }, [editTagsMode, clearSelection]);

  const handleMove = useCallback((doc: DatasetsDocument) => {
    setMoveDocumentIds([doc.id]);
    setMoveDialogOpen(true);
  }, []);

  const handleBatchMove = useCallback((ids: string[]) => {
    setMoveDocumentIds(ids);
    setMoveDialogOpen(true);
  }, []);

  const handleMoveSuccess = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleCopy = useCallback((doc: DatasetsDocument) => {
    setCopyDocumentIds([doc.id]);
    setCopyDialogOpen(true);
  }, []);

  const handleBatchCopy = useCallback((ids: string[]) => {
    setCopyDocumentIds(ids);
    setCopyDialogOpen(true);
  }, []);

  const handleCopySuccess = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <>
      <div className="bg-background relative flex h-full flex-col overflow-hidden border-l">
        <DocumentToolbar
          contentCount={dataset?.documentCount ?? documents.length}
          totalSize={dataset != null ? bytesToReadable(Number(dataset.storageSize)) : "0 B"}
          sortBy={sortBy}
          onSortChange={onSortChange}
          searchValue={searchKeyword}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchChange}
          searchExpanded={searchExpanded}
          onSearchExpandedChange={setSearchExpanded}
          rightSlot={
            !searchExpanded && canManageDocuments && selectedIds.length > 0 ? (
              <DocumentBatchActions
                selectedCount={selectedIds.length}
                onEditTags={() => handleBatchEditTags(selectedIds)}
                onMove={() => handleBatchMove(selectedIds)}
                onDelete={() => handleBatchDelete(selectedIds)}
                onCopy={() => handleBatchCopy(selectedIds)}
                onClose={clearSelection}
              />
            ) : undefined
          }
        />

        <SidebarContentBase className="p-0">
          <div
            ref={zoneRef}
            className={cn("relative h-full", canManageDocuments && "min-h-0")}
            {...handlers}
          >
            <DocumentDropZone isOver={isOver} visible={showDropZone} />

            <ScrollArea className="h-full">
              <div className="space-y-4 px-4 pb-4">
                <DocumentList
                  documents={documents}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={selectAll}
                  uploadSlot={
                    searchExpanded ? null : canManageDocuments ? (
                      <UploadTrigger variant="area" onClick={() => setUploadDialogOpen(true)} />
                    ) : null
                  }
                  onDocumentClick={onDocumentClick}
                  searchExpanded={searchExpanded}
                  searchResultCount={documents.length}
                  onBatchEditTags={handleBatchEditTags}
                  onBatchMove={handleBatchMove}
                  onBatchDelete={handleBatchDelete}
                  onBatchCopy={handleBatchCopy}
                  onDelete={handleDelete}
                  onEditTags={handleEditTags}
                  onMove={handleMove}
                  onCopy={handleCopy}
                  canManageDocuments={canManageDocuments}
                />
              </div>
            </ScrollArea>
          </div>
        </SidebarContentBase>
      </div>

      {canManageDocuments && uploadDialogOpen && (
        <UploadDialog open onOpenChange={setUploadDialogOpen} onUpload={handleUpload} />
      )}

      {editTagsOpen && (
        <EditTagsDialog
          open
          onOpenChange={setEditTagsOpen}
          datasetId={datasetId}
          mode={editTagsMode}
          document={editTagsDocument ?? undefined}
          documentIds={editTagsDocumentIds}
          onSuccess={handleEditTagsSuccess}
        />
      )}

      {moveDialogOpen && (
        <MoveDialog
          open
          onOpenChange={setMoveDialogOpen}
          sourceDatasetId={datasetId}
          documentIds={moveDocumentIds}
          onSuccess={handleMoveSuccess}
        />
      )}

      {copyDialogOpen && (
        <CopyDialog
          open
          onOpenChange={setCopyDialogOpen}
          sourceDatasetId={datasetId}
          documentIds={copyDocumentIds}
          onSuccess={handleCopySuccess}
        />
      )}
    </>
  );
}
