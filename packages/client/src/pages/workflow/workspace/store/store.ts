import type { NodeMouseHandler, OnConnect, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { create } from "zustand";

import type { WorkflowBlocksType } from "@/pages/workflow/workspace/constants/node.ts";

import { blockRegistry } from "../blocks/init";
import type { AppEdge, AppNode } from "../types";

interface WorkflowStore {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onNodeClick: NodeMouseHandler<AppNode>;
  onConnect: OnConnect;
  createNode: (params: {
    x: number;
    y: number;
    type: WorkflowBlocksType;
    initialData?: any;
  }) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  deleteNode: (nodeId: string) => void;
  validateWorkflow: () => { valid: boolean; errors: string[] };
}

const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges),
    }));
  },

  onNodeClick: () => {
    // 可以在这里添加节点点击处理逻辑
  },

  /**
   * 创建新节点
   */
  createNode: (params) => {
    const block = blockRegistry.get(params.type);

    if (!block) {
      console.error(`Block type "${params.type}" not found in registry`);
      return;
    }

    const newNode = block.createNode(params.x, params.y, params.initialData);

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
  },

  /**
   * 更新节点数据
   */
  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node,
      ),
    }));
  },

  /**
   * 删除节点
   */
  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    }));
  },

  /**
   * 验证整个工作流
   */
  validateWorkflow: () => {
    const state = get();
    const errors: string[] = [];

    state.nodes.forEach((node) => {
      const block = blockRegistry.get(node.data.type);

      if (!block) {
        errors.push(`节点 ${node.id}: Block type "${node.data.type}" 未注册`);
        return;
      }

      const validation = block.validate(node.data);

      if (!validation.valid && validation.errors) {
        validation.errors.forEach((error: any) => {
          errors.push(`节点 ${node.data.name} (${node.id}): ${error}`);
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },
}));

const selector = (state: WorkflowStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeClick: state.onNodeClick,
});

export { selector, useWorkflowStore };
