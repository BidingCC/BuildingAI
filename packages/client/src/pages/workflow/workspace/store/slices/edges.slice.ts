import type { OnConnect, OnEdgesChange } from "@xyflow/react";
import { addEdge, applyEdgeChanges } from "@xyflow/react";
import { produce } from "immer";
import type { StateCreator } from "zustand";

import type { AppEdge } from "../../types";

export interface EdgesSliceState {
  edgesMap: Map<string, AppEdge>;
  edges: AppEdge[];
}

export interface EdgesSliceActions {
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addEdge: (edge: AppEdge) => void;
  deleteEdge: (id: string) => void;
  deleteEdgesByNode: (nodeId: string) => void;
  getAllEdges: () => AppEdge[];
  clearEdges: () => void;
}

export type EdgesSlice = EdgesSliceState & EdgesSliceActions;

export const createEdgesSlice: StateCreator<EdgesSlice> = (set, get) => ({
  edgesMap: new Map(),
  edges: [],

  onEdgesChange: (changes) => {
    set(
      produce<EdgesSliceState>((draft) => {
        const updatedEdges = applyEdgeChanges(changes, draft.edges);

        draft.edgesMap.clear();
        updatedEdges.forEach((edge: AppEdge) => {
          draft.edgesMap.set(edge.id, edge);
        });
        draft.edges = updatedEdges;
      }),
    );
  },

  onConnect: (connection) => {
    set(
      produce<EdgesSliceState>((draft) => {
        const newEdges = addEdge(connection, draft.edges);

        draft.edgesMap.clear();
        newEdges.forEach((edge: AppEdge) => {
          draft.edgesMap.set(edge.id, edge);
        });
        draft.edges = newEdges;
      }),
    );
  },

  addEdge: (edge) => {
    set(
      produce<EdgesSliceState>((draft) => {
        draft.edgesMap.set(edge.id, edge);
        draft.edges = Array.from(draft.edgesMap.values());
      }),
    );
  },

  deleteEdge: (id) => {
    set(
      produce<EdgesSliceState>((draft) => {
        draft.edgesMap.delete(id);
        draft.edges = Array.from(draft.edgesMap.values());
      }),
    );
  },

  deleteEdgesByNode: (nodeId) => {
    set(
      produce<EdgesSliceState>((draft) => {
        for (const [id, edge] of draft.edgesMap) {
          if (edge.source === nodeId || edge.target === nodeId) {
            draft.edgesMap.delete(id);
          }
        }
        draft.edges = Array.from(draft.edgesMap.values());
      }),
    );
  },

  getAllEdges: () => get().edges,

  clearEdges: () => {
    set(
      produce<EdgesSliceState>((draft) => {
        draft.edgesMap.clear();
        draft.edges = [];
      }),
    );
  },
});
