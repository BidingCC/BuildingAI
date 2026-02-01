import { useCallback } from "react";

import type { WorkflowBlocksType } from "@/pages/workflow/workspace/constants/node.ts";
import { useWorkflowStore } from "@/pages/workflow/workspace/store";

interface CreateNodeParams {
  x: number;
  y: number;
  type: WorkflowBlocksType;
  initialData?: any;
}

export function useNodeActions() {
  const createNodeFromStore = useWorkflowStore((state) => state.createNode);
  const deleteNodeFromStore = useWorkflowStore((state) => state.deleteNode);
  const deleteEdgesByNode = useWorkflowStore((state) => state.deleteEdgesByNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const deleteNode = useCallback(
    (nodeId: string) => {
      deleteEdgesByNode(nodeId);
      deleteNodeFromStore(nodeId);
      selectNode(null);
    },
    [deleteEdgesByNode, deleteNodeFromStore, selectNode],
  );

  const createNode = useCallback(
    (params: CreateNodeParams) => {
      createNodeFromStore(params);
    },
    [createNodeFromStore],
  );

  return {
    createNode,
    deleteNode,
  };
}
