import type { OnConnect, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { create } from "zustand";

import { createDefaultWorkflow } from "@/pages/workflow/workspace/demo.data.ts";

import type { AppEdge, AppNode } from "./types.ts";

interface WorkflowStore {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (nodes: AppEdge[]) => void;
}

const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...createDefaultWorkflow(),
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
  setNodes: () => {},
  setEdges: () => {},
}));

const selector = (state: WorkflowStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

export { selector, useWorkflowStore };
