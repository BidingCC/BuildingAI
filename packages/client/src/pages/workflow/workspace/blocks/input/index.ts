import { nanoid } from "nanoid";

import { WorkflowBlocks } from "../../constants/node.ts";
import { WORKFLOW_BLOCK } from "../../constants/workflow.ts";
import type { AppNode } from "../../types.ts";
import { InputNode } from "./input.node";
import { InputPanel } from "./input.panel";

function inputNodeBuilder(x: number, y: number): AppNode {
  return {
    id: nanoid(),
    position: { x, y },
    type: WORKFLOW_BLOCK,
    data: {
      name: "输入",
      type: WorkflowBlocks.Input,
      vars: [{ name: "input", type: "string", required: true, label: "输入" }],
      _handles: { target: false, source: true },
    },
  };
}

export default {
  Node: InputNode,
  Panel: InputPanel,
  builder: inputNodeBuilder,
};
