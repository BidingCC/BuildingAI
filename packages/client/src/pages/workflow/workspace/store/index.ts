import { enableMapSet } from "immer";
import { create, type StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  createVariablesSlice,
  type VariablesSlice,
} from "@/pages/workflow/workspace/store/slices/variables.slice.ts";
import type { AppEdge, AppNode } from "@/pages/workflow/workspace/types.ts";

import type { EdgesSlice } from "./slices/edges.slice";
import { createEdgesSlice } from "./slices/edges.slice";
import type { NodesSlice } from "./slices/nodes.slice";
import { createNodesSlice } from "./slices/nodes.slice";
import type { UISlice } from "./slices/ui.slice";
import { createUISlice } from "./slices/ui.slice";

enableMapSet();

export type WorkflowStore = NodesSlice & EdgesSlice & UISlice & VariablesSlice;

export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    immer((...a: Parameters<StateCreator<WorkflowStore>>) => ({
      ...createNodesSlice(...a),
      ...createEdgesSlice(...a),
      ...createUISlice(...a),
      ...createVariablesSlice(...a),
    })),
    { name: "WorkflowStore" },
  ),
);

export const selectSelectedNode = (state: WorkflowStore) => {
  if (!state.selectedNodeId) return null;
  return state.nodesMap.get(state.selectedNodeId) || null;
};

export const selectReactFlowProps = (state: WorkflowStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeClick: state.onNodeClick,
});

export const getStoreState = () => useWorkflowStore.getState();

export const resetWorkflow = () => {
  const state = useWorkflowStore.getState();
  state.clearNodes();
  state.clearEdges();
  state.selectNode(null);
};

export const exportWorkflow = () => {
  const state = useWorkflowStore.getState();
  return {
    nodes: state.getAllNodes(),
    edges: state.getAllEdges(),
  };
};

export const importWorkflow = (data: { nodes: AppNode[]; edges: AppEdge[] }) => {
  const state = useWorkflowStore.getState();

  state.clearNodes();
  state.clearEdges();

  state.addNodes(data.nodes);
  data.edges.forEach((edge) => state.addEdge(edge));
};
