import type { Connection, OnConnect, OnEdgesChange } from "@xyflow/react";
import { addEdge as addReactFlowEdge, applyEdgeChanges } from "@xyflow/react";
import { nanoid } from "nanoid";
import type { StateCreator } from "zustand";

import type { AppEdge } from "../../types/node.types";

export interface EdgesSliceState {
  /** 边列表 */
  edges: AppEdge[];
}

export interface EdgesSliceActions {
  // 基础操作
  setEdges: (edges: AppEdge[]) => void;
  addEdge: (edge: AppEdge) => void;
  removeEdge: (id: string) => void;
  clearEdges: () => void;

  // ReactFlow 集成
  onEdgesChange: OnEdgesChange<AppEdge>;
  onConnect: OnConnect;
}

export type EdgesSlice = EdgesSliceState & EdgesSliceActions;

export const createEdgesSlice: StateCreator<EdgesSlice, [], [], EdgesSlice> = (set) => ({
  // 状态
  edges: [],

  // 设置边列表
  setEdges: (edges) => set({ edges }),

  // 添加边
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  // 删除边
  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),

  // 清空边
  clearEdges: () => set({ edges: [] }),

  // ReactFlow 边变化处理
  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  // ReactFlow 连接处理
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
