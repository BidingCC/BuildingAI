import type { OnNodesChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import { produce } from "immer";
import type { StateCreator } from "zustand";

import { blockRegistry } from "../../blocks/init";
import type { WorkflowBlocksType } from "../../constants/node.ts";
import type { AppNode } from "../../types";

export interface NodesSliceState {
  nodesMap: Map<string, AppNode>;
  nodes: AppNode[];
}

export interface NodesSliceActions {
  onNodesChange: OnNodesChange<AppNode>;
  addNode: (node: AppNode) => void;
  addNodes: (nodes: AppNode[]) => void;
  updateNode: (id: string, updates: Partial<AppNode>) => void;
  updateNodeData: (id: string, data: any) => void;
  deleteNode: (id: string) => void;
  getNode: (id: string) => AppNode | undefined;
  getAllNodes: () => AppNode[];
  getNodesByType: (type: WorkflowBlocksType) => AppNode[];
  clearNodes: () => void;
  createNode: (params: {
    x: number;
    y: number;
    type: WorkflowBlocksType;
    initialData?: any;
  }) => void;
  validateWorkflow: () => { valid: boolean; errors: string[] };
}

export type NodesSlice = NodesSliceState & NodesSliceActions;

export const createNodesSlice: StateCreator<NodesSlice> = (set, get) => ({
  nodesMap: new Map(),
  nodes: [],

  onNodesChange: (changes) => {
    set(
      produce<NodesSliceState>((draft) => {
        const updatedNodes = applyNodeChanges(changes, draft.nodes);

        draft.nodesMap.clear();
        updatedNodes.forEach((node: AppNode) => {
          draft.nodesMap.set(node.id, node);
        });
        draft.nodes = updatedNodes;
      }),
    );
  },

  addNode: (node) => {
    set(
      produce((draft) => {
        draft.nodesMap.set(node.id, node);
        draft.nodes = Array.from(draft.nodesMap.values());
      }),
    );
  },

  addNodes: (nodes) => {
    set(
      produce<NodesSliceState>((draft) => {
        nodes.forEach((node) => {
          draft.nodesMap.set(node.id, node);
        });
        draft.nodes = Array.from(draft.nodesMap.values());
      }),
    );
  },

  updateNode: (id, updates) => {
    set(
      produce((draft) => {
        const node = draft.nodesMap.get(id);
        if (node) {
          Object.assign(node, updates);
          draft.nodes = Array.from(draft.nodesMap.values());
        }
      }),
    );
  },

  updateNodeData: (id, data) => {
    set(
      produce<NodesSliceState>((draft) => {
        const node = draft.nodesMap.get(id);
        if (node) {
          Object.assign(node.data, data);
          draft.nodes = Array.from(draft.nodesMap.values());
        }
      }),
    );
  },

  deleteNode: (id) => {
    set(
      produce<NodesSliceState>((draft) => {
        draft.nodesMap.delete(id);
        draft.nodes = Array.from(draft.nodesMap.values());
      }),
    );
  },

  getNode: (id) => {
    return get().nodesMap.get(id);
  },

  getAllNodes: () => {
    return Array.from(get().nodesMap.values());
  },

  getNodesByType: (type) => {
    return Array.from(get().nodesMap.values()).filter((node) => node.data.type === type);
  },

  clearNodes: () => {
    set(
      produce((draft) => {
        draft.nodesMap.clear();
        draft.nodes = [];
      }),
    );
  },

  createNode: (params) => {
    const block = blockRegistry.get(params.type);

    if (!block) {
      console.error(`Block type "${params.type}" not found in registry`);
      return;
    }

    const newNode = block.createNode(params.x, params.y, params.initialData);
    get().addNode(newNode);
  },

  validateWorkflow: () => {
    const { nodesMap } = get();
    const errors: string[] = [];

    nodesMap.forEach((node) => {
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
});
