import { blockRegistry } from "./base/block.registry";
import { ConditionBlock } from "./condition";
import { HttpBlock } from "./http";
import { InputBlock } from "./input";
import { LlmBlock } from "./llm";
import { NoteBlock } from "./note";
import { OutputBlock } from "./output";

export function initBlocks() {
  blockRegistry.register(new InputBlock());
  blockRegistry.register(new OutputBlock());
  blockRegistry.register(new LlmBlock());
  blockRegistry.register(new HttpBlock());
  blockRegistry.register(new ConditionBlock());
  blockRegistry.register(new NoteBlock());
}

initBlocks();
