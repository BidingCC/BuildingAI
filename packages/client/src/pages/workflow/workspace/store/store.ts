import type { NodeMouseHandler, OnConnect, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { create } from "zustand";

import { BlockRegistry } from "@/pages/workflow/workspace/blocks";

import type { WorkflowBlocksType } from "../constants/node.ts";
import type { AppEdge, AppNode } from "../types.ts";

interface WorkflowStore {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onNodeClick: NodeMouseHandler<AppNode>;
  onConnect: OnConnect;
  createNode: (params: { x: number; y: number; type: WorkflowBlocksType }) => void;
  updateNodeData: (nodeId: string, data: any) => void;
}

const useWorkflowStore = create<WorkflowStore>((set) => ({
  nodes: [],
  edges: [],
  onNodesChange: (changes) => {
    set((state) => {
      return {
        nodes: applyNodeChanges(changes, state.nodes),
      };
    });
  },
  onEdgesChange: (changes) => {
    set((state) => {
      return {
        edges: applyEdgeChanges(changes, state.edges),
      };
    });
  },
  onConnect: (connection) => {
    set((state) => {
      return {
        edges: addEdge(connection, state.edges),
      };
    });
  },
  onNodeClick: () => {
    // console.log(event, node);
  },
  createNode: (params) => {
    const newNode = BlockRegistry[params.type].builder(params.x, params.y);
    set((state) => ({
      nodes: state.nodes.concat(newNode),
    }));
  },
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
}));

const selector = (state: WorkflowStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeClick: state.onNodeClick,
});

// const useSelectionStore = create(() => ({
//   onNodeClick: state.onNodeClick,
// }));

export { selector, useWorkflowStore };
