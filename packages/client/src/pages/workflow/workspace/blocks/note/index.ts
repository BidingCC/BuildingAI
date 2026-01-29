import { nanoid } from "nanoid";

import { NOTE_BLOCK } from "../../constants/workflow.ts";
import { NoteNode } from "./note.node";

function noteNodeBuilder(x: number, y: number) {
  return {
    id: nanoid(),
    position: { x, y },
    type: NOTE_BLOCK,
    data: {
      content: "",
      color: "yellow" as const,
    },
  };
}

export default {
  Node: NoteNode,
  Panel: null,
  builder: noteNodeBuilder,
};
