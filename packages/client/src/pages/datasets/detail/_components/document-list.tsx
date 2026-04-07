import { useI18n } from "@buildingai/i18n";
import type { DatasetsDocument } from "@buildingai/services/web";
import {
  useBatchDeleteDatasetsDocuments,
  useDeleteDatasetsDocument,
  useRetryDocumentVectorization,
} from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useDatasetDetailContext } from "../context";
import { DocumentBatchActions } from "./document-batch-actions";
import { DocumentEmpty } from "./document-empty";
import { DocumentPreview } from "./document-preview";
import { DocumentTable, DocumentTableHeader, DocumentTableSkeleton } from "./document-table";

export function DocumentList() {
  const { t } = useI18n();
  const {
    dataset,
    documents,
    canManageDocuments,
    selectedIds,
    selectAll,
    clearSelection,
    dialog,
    documentsInfinite,
  } = useDatasetDetailContext();

  const [previewDoc, setPreviewDoc] = useState<DatasetsDocument | null>(null);
  const datasetId = dataset?.id ?? "";
  const { confirm } = useAlertDialog();
  const deleteDocumentMutation = useDeleteDatasetsDocument(datasetId);
  const batchDeleteMutation = useBatchDeleteDatasetsDocuments(datasetId);
  const retryVectorizationMutation = useRetryDocumentVectorization(datasetId);

  const handleDelete = useCallback(
    async (doc: DatasetsDocument) => {
      if (!datasetId) return;
      try {
        await confirm({
          title: t("dataset.document.confirmDelete"),
          description: t("dataset.document.confirmDeleteDesc", { name: doc.fileName }),
          confirmText: t("dataset.document.deleteDocument"),
          confirmVariant: "destructive",
        });
        deleteDocumentMutation.mutate(doc.id);
      } catch {
        return;
      }
    },
    [datasetId, confirm, deleteDocumentMutation],
  );

  const handleBatchDelete = useCallback(
    async (ids: string[]) => {
      if (!datasetId || ids.length === 0) return;
      try {
        await confirm({
          title: t("dataset.document.confirmBatchDelete"),
          description: t("dataset.document.confirmBatchDeleteDesc", { count: ids.length }),
          confirmText: t("dataset.document.deleteDocument"),
          confirmVariant: "destructive",
        });
        batchDeleteMutation.mutate(ids, { onSuccess: () => clearSelection() });
      } catch {
        return;
      }
    },
    [datasetId, confirm, batchDeleteMutation, clearSelection],
  );

  const handleEditTags = useCallback(
    (doc: DatasetsDocument) => {
      dialog.open({ type: "editTags", mode: "single", document: doc, documentIds: [] });
    },
    [dialog],
  );

  const handleMove = useCallback(
    (doc: DatasetsDocument) => {
      dialog.open({ type: "transfer", mode: "move", documentIds: [doc.id] });
    },
    [dialog],
  );

  const handleCopy = useCallback(
    (doc: DatasetsDocument) => {
      dialog.open({ type: "transfer", mode: "copy", documentIds: [doc.id] });
    },
    [dialog],
  );

  const handleRetryVectorization = useCallback(
    (doc: DatasetsDocument) => {
      retryVectorizationMutation.mutate(doc.id, {
        onSuccess: () =>
          toast.success(t("dataset.document.vectorizationSubmitted", { name: doc.fileName })),
        onError: () =>
          toast.error(t("dataset.document.vectorizationFailed", { name: doc.fileName })),
      });
    },
    [retryVectorizationMutation],
  );

  const handleDocumentClick = useCallback((doc: DatasetsDocument) => {
    if (doc.fileUrl) {
      setPreviewDoc(doc);
    } else {
      toast.error(t("dataset.document.filePreviewNotSupported"));
    }
  }, []);

  if (previewDoc?.fileUrl) {
    return (
      <DocumentPreview
        fileUrl={previewDoc.fileUrl}
        fileName={previewDoc.fileName}
        onBack={() => setPreviewDoc(null)}
      />
    );
  }

  const showEmptyState = documents.length === 0 && !documentsInfinite.isFetching && dataset != null;
  if (showEmptyState) {
    return (
      <div className="flex min-h-[70vh] flex-col">
        <DocumentTableHeader canManageDocuments={canManageDocuments} />
        <DocumentEmpty canUpload={canManageDocuments} />
      </div>
    );
  }

  const showTableSkeleton =
    documents.length === 0 && (documentsInfinite.isFetching || dataset == null);

  return (
    <>
      {canManageDocuments && selectedIds.length > 0 && (
        <div className="flex items-center gap-2 py-2">
          <span className="text-muted-foreground text-sm">
            {t("dataset.document.selectedCount", { count: selectedIds.length })}
          </span>
          <DocumentBatchActions
            selectedCount={selectedIds.length}
            onEditTags={() =>
              dialog.open({ type: "editTags", mode: "batch", documentIds: [...selectedIds] })
            }
            onMove={() =>
              dialog.open({ type: "transfer", mode: "move", documentIds: [...selectedIds] })
            }
            onDelete={() => handleBatchDelete(selectedIds)}
            onCopy={() =>
              dialog.open({ type: "transfer", mode: "copy", documentIds: [...selectedIds] })
            }
            onClose={clearSelection}
          />
        </div>
      )}

      <InfiniteScroll
        loading={documentsInfinite.loading}
        hasMore={documentsInfinite.hasMore}
        onLoadMore={documentsInfinite.onLoadMore}
        emptyText=""
      >
        {showTableSkeleton ? (
          <DocumentTableSkeleton canManageDocuments={true} />
        ) : (
          <DocumentTable
            documents={documents}
            canManageDocuments={canManageDocuments}
            selectedIds={selectedIds}
            onSelectedIdsChange={selectAll}
            onDocumentClick={handleDocumentClick}
            onEditTags={handleEditTags}
            onMove={handleMove}
            onDelete={handleDelete}
            onCopy={handleCopy}
            onRetryVectorization={handleRetryVectorization}
          />
        )}
      </InfiniteScroll>
    </>
  );
}
