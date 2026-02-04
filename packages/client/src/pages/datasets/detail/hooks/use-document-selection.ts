import { useCallback, useMemo, useState } from "react";

interface DocumentSelectionState {
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export function useDocumentSelection(): DocumentSelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
