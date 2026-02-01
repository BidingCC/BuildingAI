import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { useWorkflowStore } from "../store";
import type { AppNode, BasicNodeData } from "../types";

export function useNodeEditor<T extends BasicNodeData = BasicNodeData>(nodeId: string) {
  const node = useWorkflowStore(useShallow((state) => state.nodesMap.get(nodeId))) as
    | AppNode<T>
    | undefined;

  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const immediateUpdate = useCallback(
    (updates: Partial<T>) => {
      updateNodeData(nodeId, updates);
    },
    [nodeId, updateNodeData],
  );

  if (!node) {
    return {
      data: null as unknown as T,
      immediateUpdate,
      isValid: false,
      errors: ["节点不存在"],
      node: null,
    };
  }

  return {
    node,
    data: node.data as T,
    immediateUpdate,
  };
}
