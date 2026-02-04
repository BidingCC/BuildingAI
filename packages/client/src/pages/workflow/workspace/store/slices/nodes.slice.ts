import type { OnNodesChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { StateCreator } from "zustand";

import { blockRegistry } from "../../blocks/base/block.registry";
import type { WorkflowBlocksType } from "../../constants/node";
import type { AppNode } from "../../types/node.types";

export interface NodesSliceState {
  /** 节点列表 */
  nodes: AppNode[];
  /** 节点 Map（用于 O(1) 查找） */
  nodesMap: Map<string, AppNode>;
  /** 选中的节点 ID */
  selectedNodeId: string | null;
}

export interface NodesSliceActions {
  // 基础操作
  setNodes: (nodes: AppNode[]) => void;
  addNode: (node: AppNode) => void;
  addNodes: (nodes: AppNode[]) => void;
  removeNode: (id: string) => void;
  clearNodes: () => void;

  // 节点数据更新
  updateNode: (id: string, updates: Partial<AppNode>) => void;
  updateNodeData: (id: string, dataUpdates: Record<string, any>) => void;

  // 选择操作
  selectNode: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;

  // 创建节点
  createNode: (params: { x: number; y: number; type: WorkflowBlocksType }) => AppNode | null;

  // ReactFlow 集成
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
  // 状态
  nodes: [],
  nodesMap: new Map(),
  selectedNodeId: null,

  // 设置节点列表
  setNodes: (nodes) =>
    set({
      nodes,
      nodesMap: createNodesMap(nodes),
    }),

  // 添加单个节点
  addNode: (node) =>
    set((state) => {
      const newNodes = [...state.nodes, node];
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),

  // 批量添加节点
  addNodes: (nodes) =>
    set((state) => {
      const newNodes = [...state.nodes, ...nodes];
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),

  // 删除节点
  removeNode: (id) =>
    set((state) => {
      const newNodes = state.nodes.filter((node) => node.id !== id);
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    }),

  // 清空节点
  clearNodes: () =>
    set({
      nodes: [],
      nodesMap: new Map(),
      selectedNodeId: null,
    }),

  // 更新节点
  updateNode: (id, updates) =>
    set((state) => {
      const newNodes = state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node));
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),

  // 更新节点数据
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

  // 选择节点
  selectNode: (id) => set({ selectedNodeId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // 创建节点
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

  // ReactFlow 节点变化处理
  onNodesChange: (changes) =>
    set((state) => {
      const newNodes = applyNodeChanges(changes, state.nodes);
      return {
        nodes: newNodes,
        nodesMap: createNodesMap(newNodes),
      };
    }),
});
