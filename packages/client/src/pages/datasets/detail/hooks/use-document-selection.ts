import { useCallback, useState } from "react";

interface DocumentSelectionState {
  selectedIds: string[];
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

export function useDocumentSelection(): DocumentSelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return { selectedIds, selectAll, clearSelection };
}
