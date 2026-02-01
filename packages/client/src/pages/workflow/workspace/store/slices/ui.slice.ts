import type { NodeMouseHandler } from "@xyflow/react";
import { produce } from "immer";
import type { StateCreator } from "zustand";

import type { AppNode } from "../../types";

export interface UISliceState {
  selectedNodeId: string | null;
}

export interface UISliceActions {
  selectNode: (id: string | null) => void;
  onNodeClick: NodeMouseHandler<AppNode>;
}

export type UISlice = UISliceState & UISliceActions;

export const createUISlice: StateCreator<UISlice> = (set) => ({
  selectedNodeId: null,

  selectNode: (id) => {
    set(
      produce((draft) => {
        draft.selectedNodeId = id;
      }),
    );
  },

  onNodeClick: () => {
    // 暂时保留
  },
});
