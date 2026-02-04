import { create, type StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";

import { createEdgesSlice, type EdgesSlice } from "./slices/edges.slice";
import { createNodesSlice, type NodesSlice } from "./slices/nodes.slice";

// ==================== Store 类型 ====================

export type WorkflowStore = NodesSlice & EdgesSlice;

// ==================== Store 实例 ====================

export const useWorkflowStore = create<WorkflowStore>()(
  immer((...args: Parameters<StateCreator<WorkflowStore>>) => ({
    ...createNodesSlice(...args),
    ...createEdgesSlice(...args),
  })),
);

// ==================== 选择器 ====================

/**
 * 选择 ReactFlow 需要的 props
 */
export const selectReactFlowProps = (state: WorkflowStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

/**
 * 选择当前选中的节点
 */
export const selectSelectedNode = (state: WorkflowStore) => {
  if (!state.selectedNodeId) return null;
  return state.nodesMap.get(state.selectedNodeId) ?? null;
};

/**
 * 选择节点列表
 */
export const selectNodes = (state: WorkflowStore) => state.nodes;

/**
 * 选择边列表
 */
export const selectEdges = (state: WorkflowStore) => state.edges;

/**
 * 选择选中的节点 ID
 */
export const selectSelectedNodeId = (state: WorkflowStore) => state.selectedNodeId;

// ==================== 导出 ====================

export * from "./slices/edges.slice";
export * from "./slices/nodes.slice";
