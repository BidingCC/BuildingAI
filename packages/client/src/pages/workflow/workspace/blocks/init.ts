import { blockRegistry } from "./base/block.registry";
import { HttpBlock } from "./http/http.block";
import { InputBlock } from "./input/input.block";
import { LlmBlock } from "./llm/llm.block";
import { OutputBlock } from "./output/output.block";

export function initBlocks() {
  blockRegistry.register(new InputBlock());
  blockRegistry.register(new OutputBlock());
  blockRegistry.register(new LlmBlock());
  blockRegistry.register(new HttpBlock());
}

initBlocks();
