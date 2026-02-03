import type { Dataset, DatasetsDocument } from "@buildingai/services/web";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarContent as SidebarContentBase } from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { useState } from "react";

import { bytesToReadable } from "@/utils/format";

import { useDocumentDrop, useDocumentSelection } from "../../hooks";
import type { DocumentSortBy } from "../../types";
import { UploadDialog } from "../dialogs/upload-dialog";
import { DocumentBatchActions, DocumentDropZone, DocumentList, DocumentToolbar } from "../document";
import { UploadTrigger } from "../upload";

export interface SidebarContentProps {
  dataset: Dataset | undefined;
  documents: DatasetsDocument[];
  onUpload?: (files: File[]) => void;
  onDocumentClick?: (document: DatasetsDocument) => void;
}

export function SidebarContent({
  dataset,
  documents,
  onUpload,
  onDocumentClick,
}: SidebarContentProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<DocumentSortBy>("name");
  const [searchExpanded, setSearchExpanded] = useState(false);

  const isOwner = dataset?.isOwner ?? false;

  // 使用 hooks 管理状态
  const { selectedIds, clearSelection, selectAll } = useDocumentSelection();
  const { zoneRef, isOver, showDropZone, handlers } = useDocumentDrop({
    enabled: isOwner,
    onDrop: onUpload,
  });

  const handleUpload = (files: File[]) => {
    onUpload?.(files);
    setUploadDialogOpen(false);
  };

  return (
    <>
      <div className="bg-background relative flex h-full flex-col overflow-hidden border-l">
        {/* 工具栏 */}
        <DocumentToolbar
          contentCount={dataset?.documentCount ?? documents.length}
          totalSize={dataset != null ? bytesToReadable(Number(dataset.storageSize)) : "0 B"}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchExpanded={searchExpanded}
          onSearchExpandedChange={setSearchExpanded}
          rightSlot={
            !searchExpanded && selectedIds.length > 0 ? (
              <DocumentBatchActions
                selectedCount={selectedIds.length}
                onEditTags={() => {}}
                onMove={() => {}}
                onDelete={() => {}}
                onCopy={() => {}}
                onClose={clearSelection}
              />
            ) : undefined
          }
        />

        {/* 内容区 */}
        <SidebarContentBase className="p-0">
          <div ref={zoneRef} className={cn("relative h-full", isOwner && "min-h-0")} {...handlers}>
            {/* 拖拽上传区 */}
            <DocumentDropZone isOver={isOver} visible={showDropZone} />

            {/* 文档列表 */}
            <ScrollArea className="h-full">
              <div className="space-y-4 px-4 pb-4">
                <DocumentList
                  documents={documents}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={selectAll}
                  uploadSlot={
                    searchExpanded ? null : isOwner ? (
                      <UploadTrigger variant="area" onClick={() => setUploadDialogOpen(true)} />
                    ) : null
                  }
                  onDocumentClick={onDocumentClick}
                  searchExpanded={searchExpanded}
                  searchResultCount={documents.length}
                  onBatchEditTags={() => {}}
                  onBatchMove={() => {}}
                  onBatchDelete={() => {}}
                  onBatchCopy={() => {}}
                />
              </div>
            </ScrollArea>
          </div>
        </SidebarContentBase>
      </div>

      {/* 上传对话框 */}
      {isOwner && (
        <UploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUpload={handleUpload}
        />
      )}
    </>
  );
}
