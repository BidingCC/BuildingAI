import { BlockBase } from "../base/block.base";
import { NoteNodeComponent } from "./note.node";
import { NotePanelComponent } from "./note.panel";
import type { NoteBlockData } from "./note.types";

/**
 * Note Block 类
 * 辅助工具：用于在工作流中添加笔记和注释
 * 
 * 特殊性：
 * - 直接在 Node 上编辑，不需要 Panel
 * - 不参与工作流执行
 * - 无连接点（handles）
 */
export class NoteBlock extends BlockBase<NoteBlockData> {
  constructor() {
    super({
      type: "note",
      label: "笔记",
      description: "在工作流中添加笔记和注释",
      category: "tool",
      icon: "📝",
      defaultData: () => ({
        content: "",
        color: "yellow",
      }),
      handles: {
        target: false,
        source: false,
      },
    });
  }

  get NodeComponent() {
    return NoteNodeComponent;
  }

  get PanelComponent() {
    return NotePanelComponent;
  }

  /**
   * Note 节点不需要验证
   * 任何内容都是有效的
   */
  validate(_data: NoteBlockData) {
    return { valid: true };
  }
}
