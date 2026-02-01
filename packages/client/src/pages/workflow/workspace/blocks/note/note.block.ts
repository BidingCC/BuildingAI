import { Ghost } from "lucide-react";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
import { NoteNodeComponent } from "./note.node";
import { NotePanelComponent } from "./note.panel";
import type { NoteBlockData } from "./note.types";

export class NoteBlock extends BlockBase<NoteBlockData> {
  constructor() {
    super({
      type: "note",
      name: "笔记",
      description: "在工作流中添加笔记和注释",
      category: "tool",
      icon: createElement(Ghost),
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

  validate(_data: NoteBlockData) {
    return { valid: true };
  }
}
