import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarContent } from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { Upload as UploadIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DocumentItem } from "../_components/documents";
import { DocumentBatchActions, DocumentList } from "../_components/documents";
import { DocumentsNavbar, type DocumentsSortBy } from "../_components/documents-navbar";
import { UploadDialog } from "../_components/upload-dialog";
import { UploadTrigger } from "../_components/upload-trigger";
import type { DatasetInfo } from "./content-navbar";

const SUPPORTED_FORMATS = "支持 docx、xlsx、pptx、pdf、csv、md 等格式";

export interface DatasetSidebarProps {
  mode: "own" | "others";
  dataset: DatasetInfo;
  documents: DocumentItem[];
  onUpload?: (files: File[]) => void;
  onJoin?: () => void;
  onPublish?: () => void;
  onDocumentClick?: (document: DocumentItem) => void;
}

const isFiles = (dt: DataTransfer) => dt.types.includes("Files");

export function DatasetSidebar({
  mode,
  dataset,
  documents,
  onUpload,
  onDocumentClick,
}: DatasetSidebarProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<DocumentsSortBy>("name");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dropPhase, setDropPhase] = useState<"idle" | "over" | "left">("idle");
  const zoneRef = useRef<HTMLDivElement>(null);
  const isOwn = mode === "own";

  useEffect(() => {
    const hide = () => setDropPhase("idle");
    const onDragLeaveDoc = (e: DragEvent) => {
      if (e.relatedTarget === null) hide();
    };
    const onDragoverDoc = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const cap = true;
    window.addEventListener("dragend", hide, cap);
    document.addEventListener("dragend", hide, cap);
    document.addEventListener("drop", hide, cap);
    document.addEventListener("dragleave", onDragLeaveDoc, cap);
    if (dropPhase === "left") document.addEventListener("dragover", onDragoverDoc, cap);
    return () => {
      window.removeEventListener("dragend", hide, cap);
      document.removeEventListener("dragend", hide, cap);
      document.removeEventListener("drop", hide, cap);
      document.removeEventListener("dragleave", onDragLeaveDoc, cap);
      document.removeEventListener("dragover", onDragoverDoc, cap);
    };
  }, [dropPhase]);

  const onZoneDrag = useCallback((e: React.DragEvent) => {
    if (!isFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropPhase("over");
  }, []);

  const onZoneLeave = useCallback((e: React.DragEvent) => {
    if (!isFiles(e.dataTransfer)) return;
    const { current: root } = zoneRef;
    const related = e.relatedTarget as Node | null;
    if (!root || !related || !root.contains(related)) setDropPhase("left");
  }, []);

  const onZoneDrop = useCallback((e: React.DragEvent) => {
    if (!isFiles(e.dataTransfer)) return;
    e.preventDefault();
    setDropPhase("idle");
  }, []);

  const showDropZone = isOwn && dropPhase !== "idle";
  const isOver = dropPhase === "over";

  return (
    <>
      <div className="bg-background relative flex h-full flex-col overflow-hidden border-l">
        <DocumentsNavbar
          contentCount={dataset.contentCount ?? documents.length}
          totalSize={dataset.totalSize ?? "0KB"}
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
                onClose={() => setSelectedIds([])}
              />
            ) : undefined
          }
        />
        <SidebarContent className="p-0">
          <div
            ref={zoneRef}
            className={cn("relative h-full", isOwn && "min-h-0")}
            onDragEnter={onZoneDrag}
            onDragOver={onZoneDrag}
            onDragLeave={onZoneLeave}
            onDrop={onZoneDrop}
          >
            {showDropZone && (
              <div
                className={cn(
                  "bor der-dashed absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 px-4 backdrop-blur-xs transition-colors",
                  isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/30",
                )}
              >
                <div className="bg-primary/10 rounded-full p-4">
                  <UploadIcon className="text-primary size-8" />
                </div>
                <p className="text-center text-sm font-semibold">
                  {isOver ? "释放添加" : "拖拽文件到此处上传"}
                </p>
                <p className="text-muted-foreground text-xs">{SUPPORTED_FORMATS}</p>
              </div>
            )}
            <ScrollArea className="h-full">
              <div className="space-y-4 px-4 pb-4">
                <DocumentList
                  documents={documents}
                  uploadSlot={
                    searchExpanded ? null : isOwn ? (
                      <UploadTrigger variant="area" onClick={() => setUploadDialogOpen(true)} />
                    ) : null
                  }
                  onDocumentClick={onDocumentClick}
                  searchExpanded={searchExpanded}
                  searchResultCount={documents.length}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
                  onBatchEditTags={() => {}}
                  onBatchMove={() => {}}
                  onBatchDelete={() => {}}
                  onBatchCopy={() => {}}
                />
              </div>
            </ScrollArea>
          </div>
        </SidebarContent>
      </div>

      {isOwn && (
        <UploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUpload={(files) => {
            onUpload?.(files);
            setUploadDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
