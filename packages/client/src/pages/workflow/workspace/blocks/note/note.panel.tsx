import type { FunctionComponent } from "react";
import type { BlockPanelProps } from "../base/block.base";
import type { NoteBlockData } from "./note.types";

/**
 * Note Panel 组件
 * Note 节点直接在 Node 上编辑，不需要单独的 Panel
 * 这个组件永远不会被渲染，仅作为架构完整性的占位符
 */
export const NotePanelComponent: FunctionComponent<BlockPanelProps<NoteBlockData>> = () => {
  return null;
};
