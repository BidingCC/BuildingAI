import type { OnNodesChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { StateCreator } from "zustand";

import { blockRegistry } from "../../blocks/base/block.registry";
import type { WorkflowBlocksType } from "../../constants/node";
import type { AppNode } from "../../types/node.types";

export interface NodesSliceState {
  nodes: AppNode[];
  /**
   * Node Map (for O(1) lookup)
   */
  nodesMap: Map<string, AppNode>;
  selectedNodeId: string | null;
}

export interface NodesSliceActions {
  setNodes: (nodes: AppNode[]) => void;
  addNode: (node: AppNode) => void;
  addNodes: (nodes: AppNode[]) => void;
  clearNodes: () => void;

  updateNodeData: (id: string, dataUpdates: Record<string, any>) => void;

  selectNode: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;

  createNode: (params: { x: number; y: number; type: WorkflowBlocksType }) => AppNode | null;

  onNodesChange: OnNodesChange<AppNode>;
}

export type NodesSlice = NodesSliceState & NodesSliceActions;

/**
 * 根据节点数组创建 Map
 */
function createNodesMap(nodes: AppNode[]): Map<string, AppNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export const createNodesSlice: StateCreator<NodesSlice, [], [], NodesSlice> = (set, get) => ({
  nodes: [],
  nodesMap: new Map(),
  selectedNodeId: null,

  setNodes: (nodes) =>
    set({
      nodes,
      nodesMap: createNodesMap(nodes),
    }),

  addNode: (node) =>
    set((state) => {
      const newNodes = [...state.nodes, node];
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),

  addNodes: (nodes) =>
    set((state) => {
      const newNodes = [...state.nodes, ...nodes];
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),

  clearNodes: () =>
    set({
      nodes: [],
      nodesMap: new Map(),
      selectedNodeId: null,
    }),

  updateNodeData: (id, dataUpdates) =>
    set((state) => {
      const newNodes = state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...dataUpdates } } : node,
      );
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),

  selectNode: (id) => set({ selectedNodeId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  createNode: ({ x, y, type }) => {
    const block = blockRegistry.get(type);
    if (!block) {
      console.warn(`Block type "${type}" not found in registry`);
      return null;
    }

    const node = block.createNode(x, y);
    get().addNode(node);
    return node;
  },

  onNodesChange: (changes) =>
    set((state) => {
      const newNodes = applyNodeChanges(changes, state.nodes);
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),
});
