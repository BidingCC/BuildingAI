import { LlmNode } from "./llm.node";
import { LlmPanel } from "./llm.panel";

function LlmNodeBuilder() {
  return {} as any;
}

export default {
  Node: LlmNode,
  Panel: LlmPanel,
  builder: LlmNodeBuilder,
};
