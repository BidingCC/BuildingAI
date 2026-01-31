import { blockRegistry } from "./base/block.registry";
import { ConditionBlock } from "./condition";
import { HttpBlock } from "./http";
import { InputBlock } from "./input";
import { LlmBlock } from "./llm";
import { NoteBlock } from "./note";
import { OutputBlock } from "./output";

/**
 * Initialize all blocks when the app starts
 */
export function initializeBlocks() {
  blockRegistry.registerAll([
    new InputBlock(),
    new OutputBlock(),
    new LlmBlock(),
    new ConditionBlock(),
    new HttpBlock(),
    new NoteBlock(),
  ]);

  console.log(`[BlockRegistry] Initialized ${blockRegistry.getAllMetadata().length} blocks`);
}

// 导出注册表实例
export { blockRegistry };
