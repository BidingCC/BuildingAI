import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { selectSelectedNode, useWorkflowStore } from "../store";
import type { AppNode, BaseNodeData } from "../types";

export function useWorkflowSelection() {
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const selectedNode = useWorkflowStore(useShallow(selectSelectedNode));
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const clearSelection = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const toggleNodeSelection = useCallback(
    (nodeId: string) => {
      if (selectedNodeId === nodeId) {
        selectNode(null);
      } else {
        selectNode(nodeId);
      }
    },
    [selectedNodeId, selectNode],
  );

  const isNodeSelected = useCallback(
    (nodeId: string) => {
      return selectedNodeId === nodeId;
    },
    [selectedNodeId],
  );

  return {
    selectedNodeId,
    selectedNode,
    selectNode,
    clearSelection,
    toggleNodeSelection,
    isNodeSelected,
  };
}

export function useSelectedNode<T extends BaseNodeData = BaseNodeData>(): AppNode<T> | null {
  return useWorkflowStore(useShallow(selectSelectedNode)) as AppNode<T> | null;
}
