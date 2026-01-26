import { WorkflowBlocks } from "../../constants/node.ts";
import { InputNode } from "./input.node";
import { InputPanel } from "./input.panel";
import type { InputNodeProps } from "./input.types.ts";

function inputNodeBuilder(): InputNodeProps {
  return {
    name: "输入",
    type: WorkflowBlocks.Input,
    vars: [{ name: "input", type: "string", required: true, label: "输入" }],
    _handles: { target: false, source: true },
  };
}

export default {
  Node: InputNode,
  Panel: InputPanel,
  builder: inputNodeBuilder,
};
