import type { Dataset, DatasetsDocument } from "@buildingai/services/web";
import { createContext, useContext } from "react";

import type { DialogManager } from "../hooks/use-dialog-manager";

export type DocumentTab = "all" | "text" | "table" | "image";

export interface DatasetDetailContextValue {
  dataset: Dataset | undefined;
  documents: DatasetsDocument[];
  canManageDocuments: boolean;
  isOwner: boolean;
  activeTab: DocumentTab;
  setActiveTab: (tab: DocumentTab) => void;
  uploadDocuments: (files: File[]) => void;
  selectedIds: string[];
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  dialog: DialogManager;
  documentsInfinite: {
    hasMore: boolean;
    loading: boolean;
    isFetching: boolean;
    onLoadMore: () => void;
  };
}

const DatasetDetailContext = createContext<DatasetDetailContextValue | null>(null);

export const DatasetDetailProvider = DatasetDetailContext.Provider;

export function useDatasetDetailContext() {
  const ctx = useContext(DatasetDetailContext);
  if (!ctx) throw new Error("useDatasetDetailContext must be used within DatasetDetailProvider");
  return ctx;
}
