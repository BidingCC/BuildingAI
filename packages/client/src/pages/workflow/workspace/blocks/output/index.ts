import { nanoid } from "nanoid";

import { WorkflowBlocks } from "@/pages/workflow/workspace/constants/node.ts";
import { WORKFLOW_BLOCK } from "@/pages/workflow/workspace/constants/workflow.ts";
import type { AppNode } from "@/pages/workflow/workspace/types.ts";

import { OutputNode } from "./output.node";
import { OutputPanel } from "./output.panel";

function createOutputNodeInstance(x: number, y: number): AppNode {
  return {
    id: nanoid(),
    position: { x, y },
    type: WORKFLOW_BLOCK,
    data: {
      name: "输出",
      type: WorkflowBlocks.Output,
      vars: [{ name: "output", type: "string", label: "输出值", required: true }],
      _handles: { target: true, source: false },
    },
  };
}

export default {
  Node: OutputNode,
  Panel: OutputPanel,
  builder: createOutputNodeInstance,
};
