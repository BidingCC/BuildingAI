import { WorkflowBlocks } from "@/pages/workflow/workspace/constants/node.ts";

import { OutputNode } from "./output.node";
import { OutputPanel } from "./output.panel";
import type { OutputNodeProps } from "./output.types.ts";

function createOutputNodeInstance(): OutputNodeProps {
  return {
    name: "输出",
    type: WorkflowBlocks.Output,
    vars: [{ name: "output", type: "string", label: "输出值", required: true }],
    _handles: { target: true, source: false },
  };
}

export default {
  Node: OutputNode,
  Panel: OutputPanel,
  builder: createOutputNodeInstance,
};
