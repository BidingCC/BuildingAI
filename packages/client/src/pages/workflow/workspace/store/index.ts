import { create, type StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";

import { createEdgesSlice, type EdgesSlice } from "./slices/edges.slice";
import { createNodesSlice, type NodesSlice } from "./slices/nodes.slice";

export type WorkflowStore = NodesSlice & EdgesSlice;

export const useWorkflowStore = create<WorkflowStore>()(
  immer((...args: Parameters<StateCreator<WorkflowStore>>) => ({
    ...createNodesSlice(...args),
    ...createEdgesSlice(...args),
  })),
);

export const selectReactFlowProps = (state: WorkflowStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

export const selectSelectedNode = (state: WorkflowStore) => {
  if (!state.selectedNodeId) return null;
  return state.nodesMap.get(state.selectedNodeId) ?? null;
};

export const selectNodes = (state: WorkflowStore) => state.nodes;

export const selectEdges = (state: WorkflowStore) => state.edges;

export const selectSelectedNodeId = (state: WorkflowStore) => state.selectedNodeId;

export * from "./slices/edges.slice";
export * from "./slices/nodes.slice";
