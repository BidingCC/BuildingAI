import type { Connection, OnConnect, OnEdgesChange } from "@xyflow/react";
import { addEdge as addReactFlowEdge, applyEdgeChanges } from "@xyflow/react";
import { nanoid } from "nanoid";
import type { StateCreator } from "zustand";

import type { AppEdge } from "../../types/node.types";

export interface EdgesSliceState {
  edges: AppEdge[];
}

export interface EdgesSliceActions {
  setEdges: (edges: AppEdge[]) => void;
  addEdge: (edge: AppEdge) => void;
  removeEdge: (id: string) => void;
  clearEdges: () => void;

  onEdgesChange: OnEdgesChange<AppEdge>;
  onConnect: OnConnect;
}

export type EdgesSlice = EdgesSliceState & EdgesSliceActions;

export const createEdgesSlice: StateCreator<EdgesSlice, [], [], EdgesSlice> = (set) => ({
  edges: [],

  setEdges: (edges) => set({ edges }),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),

  clearEdges: () => set({ edges: [] }),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection: Connection) =>
    set((state) => ({
      edges: addReactFlowEdge(
        {
          ...connection,
          id: nanoid(),
        },
        state.edges,
      ),
    })),
});
